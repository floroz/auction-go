#!/bin/sh
set -o errexit

# --- Configuration ---
reg_name='local-kind-registry'
reg_port='5001'
CLUSTER_NAME="auction-cluster"

# --- Pre-flight Checks ---
echo "Checking dependencies..."
for cmd in docker kind kubectl; do
  if ! command -v $cmd >/dev/null 2>&1; then
    echo "Error: $cmd is not installed."
    exit 1
  fi
done

echo "Checking port availability..."
for port in 8080 8443 $reg_port; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
    echo "Error: Port $port is already in use. Please free it before running this script."
    exit 1
  fi
done

# 1. Create registry container unless it already exists
if [ "$(docker inspect -f '{{.State.Running}}' "${reg_name}" 2>/dev/null || true)" != 'true' ]; then
  echo "Creating local registry..."
  docker run \
    -d --restart=always -p "127.0.0.1:${reg_port}:5000" --name "${reg_name}" \
    registry:2
fi

# 2. Create kind cluster with containerd registry config dir enabled
if kind get clusters | grep -q "${CLUSTER_NAME}"; then
  echo "Cluster ${CLUSTER_NAME} already exists"
else
  echo "Creating cluster '${CLUSTER_NAME}'..."
  cat <<EOF | kind create cluster --name "${CLUSTER_NAME}" --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 8080 # Map host 8080 to ingress 80
    protocol: TCP
  - containerPort: 443
    hostPort: 8443
    protocol: TCP
containerdConfigPatches:
- |-
  [plugins."io.containerd.grpc.v1.cri".registry]
    config_path = "/etc/containerd/certs.d"
EOF
fi

# 3. Add the registry config to the nodes
REGISTRY_DIR="/etc/containerd/certs.d/localhost:${reg_port}"
for node in $(kind get nodes --name "${CLUSTER_NAME}"); do
  docker exec "${node}" mkdir -p "${REGISTRY_DIR}"
  cat <<EOF | docker exec -i "${node}" cp /dev/stdin "${REGISTRY_DIR}/hosts.toml"
[host."http://${reg_name}:5000"]
EOF
done

# 4. Connect the registry to the cluster network if not already connected
if [ "$(docker inspect -f='{{json .NetworkSettings.Networks.kind}}' "${reg_name}")" = 'null' ]; then
  echo "Connecting registry to kind network..."
  docker network connect "kind" "${reg_name}"
fi

# 5. Wait for the cluster to be ready
echo "Waiting for cluster nodes to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=60s

# 6. Document the local registry
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-registry-hosting
  namespace: kube-public
data:
  localRegistryHosting.v1: |
    host: "localhost:${reg_port}"
    help: "https://kind.sigs.k8s.io/docs/user/local-registry/"
EOF

echo "Local Kind cluster '${CLUSTER_NAME}' created successfully!"
echo "Access points:"
echo "  - Ingress: http://localhost:8080"
echo "  - HTTPS:   https://localhost:8443"
echo "  - Registry: localhost:${reg_port}"

