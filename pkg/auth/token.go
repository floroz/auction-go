package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Claims extends standard JWT claims with our custom fields.
type Claims struct {
	jwt.RegisteredClaims
	Email       string   `json:"email"`
	FullName    string   `json:"full_name"`
	Role        string   `json:"role"` // For future RBAC
	Permissions []string `json:"permissions"`
}

// TokenPair contains both access and refresh tokens.
type TokenPair struct {
	AccessToken  string
	RefreshToken string
	AccessExpiry time.Time
}

// Signer handles token generation and validation.
type Signer struct {
	privateKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
}

// NewSigner creates a Signer from PEM-encoded keys.
func NewSigner(privateKeyPEM, publicKeyPEM []byte) (*Signer, error) {
	block, _ := pem.Decode(privateKeyPEM)
	if block == nil {
		return nil, errors.New("failed to parse private key PEM")
	}
	priv, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}

	blockPub, _ := pem.Decode(publicKeyPEM)
	if blockPub == nil {
		return nil, errors.New("failed to parse public key PEM")
	}
	pub, err := x509.ParsePKIXPublicKey(blockPub.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse public key: %w", err)
	}
	rsaPub, ok := pub.(*rsa.PublicKey)
	if !ok {
		return nil, errors.New("public key is not RSA")
	}

	return &Signer{
		privateKey: priv,
		publicKey:  rsaPub,
	}, nil
}

// GenerateTokens creates an access token (JWT) and a refresh token (random string).
func (s *Signer) GenerateTokens(userID uuid.UUID, email, fullName string, permissions []string) (*TokenPair, error) {
	now := time.Now()
	accessExpiry := now.Add(15 * time.Minute)

	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			ExpiresAt: jwt.NewNumericDate(accessExpiry),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "gavel-auth-service",
		},
		Email:       email,
		FullName:    fullName,
		Permissions: permissions,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	signedToken, err := token.SignedString(s.privateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to sign token: %w", err)
	}

	// Generate Refresh Token (32 bytes of entropy)
	refreshToken, err := generateRandomString(32)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  signedToken,
		RefreshToken: refreshToken,
		AccessExpiry: accessExpiry,
	}, nil
}

// ValidateToken parses and verifies the JWT signature.
func (s *Signer) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.publicKey, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// We need a helper for generating a secure random string for refresh tokens and other secrets.
// This ensures sufficient entropy and URL-safe characters for security.
func generateRandomString(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
