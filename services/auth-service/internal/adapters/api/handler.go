package api

import (
	"context"
	"errors"
	"time"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"

	authv1 "github.com/floroz/gavel/pkg/proto/auth/v1"
	"github.com/floroz/gavel/pkg/proto/auth/v1/authv1connect"
	"github.com/floroz/gavel/services/auth-service/internal/domain/users"
)

type AuthServiceHandler struct {
	authv1connect.UnimplementedAuthServiceHandler
	service users.AuthService
}

func NewAuthServiceHandler(service users.AuthService) *AuthServiceHandler {
	return &AuthServiceHandler{
		service: service,
	}
}

func (h *AuthServiceHandler) Register(
	ctx context.Context,
	req *connect.Request[authv1.RegisterRequest],
) (*connect.Response[authv1.RegisterResponse], error) {
	user, err := h.service.Register(
		ctx,
		req.Msg.Email,
		req.Msg.Password,
		req.Msg.FullName,
		req.Msg.CountryCode,
	)
	if err != nil {
		if errors.Is(err, users.ErrUserAlreadyExists) {
			return nil, connect.NewError(connect.CodeAlreadyExists, err)
		}
		if errors.Is(err, users.ErrInvalidInput) {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&authv1.RegisterResponse{
		UserId: user.ID.String(),
	}), nil
}

func (h *AuthServiceHandler) Login(
	ctx context.Context,
	req *connect.Request[authv1.LoginRequest],
) (*connect.Response[authv1.LoginResponse], error) {
	// Extract IP and User Agent if not provided in body (though proto has fields for them)
	// Ideally, the gateway or client populates these.
	ip := req.Msg.IpAddress
	ua := req.Msg.UserAgent

	accessToken, refreshToken, err := h.service.Login(ctx, req.Msg.Email, req.Msg.Password, ua, ip)
	if err != nil {
		if errors.Is(err, users.ErrInvalidCredentials) {
			return nil, connect.NewError(connect.CodeUnauthenticated, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&authv1.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		// Expiry is 15m from now, but the service doesn't return the time.
		// We could update service to return it, or just calculate it here roughly or decode the token.
		// For now, let's leave it empty or update service.
		// Service returns strings. Let's update service later if needed.
		ExpiresAt: timestamppb.New(timestamppb.Now().AsTime().Add(15 * time.Minute)), // Approximation
	}), nil
}

func (h *AuthServiceHandler) Refresh(
	ctx context.Context,
	req *connect.Request[authv1.RefreshRequest],
) (*connect.Response[authv1.RefreshResponse], error) {
	accessToken, refreshToken, err := h.service.Refresh(ctx, req.Msg.RefreshToken, req.Msg.UserAgent, req.Msg.IpAddress)
	if err != nil {
		if errors.Is(err, users.ErrInvalidToken) || errors.Is(err, users.ErrUserNotFound) {
			return nil, connect.NewError(connect.CodeUnauthenticated, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&authv1.RefreshResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    timestamppb.New(timestamppb.Now().AsTime().Add(15 * time.Minute)),
	}), nil
}

func (h *AuthServiceHandler) Logout(
	ctx context.Context,
	req *connect.Request[authv1.LogoutRequest],
) (*connect.Response[authv1.LogoutResponse], error) {
	err := h.service.Logout(ctx, req.Msg.RefreshToken)
	if err != nil {
		// Even if error (e.g. not found), we usually return OK for logout to not leak info
		// But logging it is good.
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&authv1.LogoutResponse{}), nil
}

func (h *AuthServiceHandler) GetProfile(
	ctx context.Context,
	req *connect.Request[authv1.GetProfileRequest],
) (*connect.Response[authv1.GetProfileResponse], error) {
	var userID uuid.UUID
	var err error

	if req.Msg.UserId != "" {
		userID, err = uuid.Parse(req.Msg.UserId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid user_id"))
		}
	} else {
		// TODO: Extract from context once middleware is in place
		return nil, connect.NewError(connect.CodeUnimplemented, errors.New("get profile for 'me' not implemented yet"))
	}

	user, err := h.service.GetProfile(ctx, userID)
	if err != nil {
		if errors.Is(err, users.ErrUserNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&authv1.GetProfileResponse{
		Id:          user.ID.String(),
		Email:       user.Email,
		FullName:    user.FullName,
		AvatarUrl:   user.AvatarURL,
		CountryCode: user.CountryCode,
		CreatedAt:   timestamppb.New(user.CreatedAt),
	}), nil
}
