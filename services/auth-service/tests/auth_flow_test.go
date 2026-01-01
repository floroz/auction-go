package tests

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	authv1 "github.com/floroz/gavel/pkg/proto/auth/v1"
	"github.com/floroz/gavel/pkg/testhelpers"
)

func TestAuth_Flows(t *testing.T) {
	// Setup DB Container
	testDB := testhelpers.NewTestDatabase(t, "../migrations")
	defer testDB.Close()

	// Setup Application
	client, pool := setupAuthApp(t, testDB.Pool)

	t.Run("Register_Success", func(t *testing.T) {
		req := connect.NewRequest(&authv1.RegisterRequest{
			Email:       "newuser@example.com",
			Password:    "password123",
			FullName:    "New User",
			PhoneNumber: "+15551234567",
			CountryCode: "US",
		})

		res, err := client.Register(context.Background(), req)
		require.NoError(t, err)
		assert.NotEmpty(t, res.Msg.UserId)

		// Verify DB
		user := verifyUserExists(t, pool, "newuser@example.com")
		require.NotNil(t, user)
		assert.Equal(t, "New User", user.FullName)
		assert.Equal(t, "+15551234567", user.PhoneNumber)

		// Verify Outbox Event
		exists := verifyOutboxEventExists(t, pool, "user.created")
		assert.True(t, exists, "UserCreated event should be in outbox")
	})

	t.Run("Register_DuplicateEmail", func(t *testing.T) {
		// First registration
		req1 := connect.NewRequest(&authv1.RegisterRequest{
			Email:       "duplicate@example.com",
			Password:    "password123",
			FullName:    "Original User",
			PhoneNumber: "+15551111111",
			CountryCode: "US",
		})
		_, err := client.Register(context.Background(), req1)
		require.NoError(t, err)

		// Second registration (should fail)
		req2 := connect.NewRequest(&authv1.RegisterRequest{
			Email:       "duplicate@example.com",
			Password:    "otherpassword",
			FullName:    "Imposter",
			PhoneNumber: "+15552222222",
			CountryCode: "US",
		})
		_, err = client.Register(context.Background(), req2)
		require.Error(t, err)
		assert.Equal(t, connect.CodeAlreadyExists, connect.CodeOf(err))
	})

	t.Run("Register_InvalidEmail", func(t *testing.T) {
		req := connect.NewRequest(&authv1.RegisterRequest{
			Email:       "bad-email",
			Password:    "password123",
			FullName:    "Bad Email",
			PhoneNumber: "+15553333333",
			CountryCode: "US",
		})
		_, err := client.Register(context.Background(), req)
		require.Error(t, err)
		assert.Equal(t, connect.CodeInvalidArgument, connect.CodeOf(err))
	})

	t.Run("Register_PasswordTooShort", func(t *testing.T) {
		req := connect.NewRequest(&authv1.RegisterRequest{
			Email:       "shortpass@example.com",
			Password:    "short",
			FullName:    "Short Pass",
			PhoneNumber: "+15554444444",
			CountryCode: "US",
		})
		_, err := client.Register(context.Background(), req)
		require.Error(t, err)
		assert.Equal(t, connect.CodeInvalidArgument, connect.CodeOf(err))
	})

	t.Run("Register_InvalidCountryCode", func(t *testing.T) {
		req := connect.NewRequest(&authv1.RegisterRequest{
			Email:       "badcountry@example.com",
			Password:    "password123",
			FullName:    "Bad Country",
			PhoneNumber: "+15555555555",
			CountryCode: "USA", // Too long
		})
		_, err := client.Register(context.Background(), req)
		require.Error(t, err)
		assert.Equal(t, connect.CodeInvalidArgument, connect.CodeOf(err))

		req2 := connect.NewRequest(&authv1.RegisterRequest{
			Email:       "badcountry2@example.com",
			Password:    "password123",
			FullName:    "Bad Country 2",
			PhoneNumber: "+15556666666",
			CountryCode: "12", // Not letters
		})
		_, err = client.Register(context.Background(), req2)
		require.Error(t, err)
		assert.Equal(t, connect.CodeInvalidArgument, connect.CodeOf(err))
	})

	t.Run("Register_EmptyName", func(t *testing.T) {
		req := connect.NewRequest(&authv1.RegisterRequest{
			Email:       "noname@example.com",
			Password:    "password123",
			FullName:    "",
			PhoneNumber: "+15557777777",
			CountryCode: "US",
		})
		_, err := client.Register(context.Background(), req)
		require.Error(t, err)
		assert.Equal(t, connect.CodeInvalidArgument, connect.CodeOf(err))
	})

	t.Run("Register_EmptyPhoneNumber", func(t *testing.T) {
		req := connect.NewRequest(&authv1.RegisterRequest{
			Email:       "nophone@example.com",
			Password:    "password123",
			FullName:    "No Phone",
			PhoneNumber: "",
			CountryCode: "US",
		})
		_, err := client.Register(context.Background(), req)
		require.Error(t, err)
		assert.Equal(t, connect.CodeInvalidArgument, connect.CodeOf(err))
	})

	t.Run("Login_Success", func(t *testing.T) {
		// Register first
		email := "loginuser@example.com"
		password := "securepass"
		_, err := client.Register(context.Background(), connect.NewRequest(&authv1.RegisterRequest{
			Email:       email,
			Password:    password,
			FullName:    "Login User",
			PhoneNumber: "+15558888888",
			CountryCode: "US",
		}))
		require.NoError(t, err)

		// Attempt Login
		loginReq := connect.NewRequest(&authv1.LoginRequest{
			Email:     email,
			Password:  password,
			UserAgent: "TestAgent/1.0",
			IpAddress: "127.0.0.1",
		})
		res, err := client.Login(context.Background(), loginReq)
		require.NoError(t, err)
		assert.NotEmpty(t, res.Msg.AccessToken)
		assert.NotEmpty(t, res.Msg.RefreshToken)

		// Verify Refresh Token in DB
		user := verifyUserExists(t, pool, email)
		require.NotNil(t, user)
		exists := verifyTokenExists(t, pool, user.ID)
		assert.True(t, exists, "Refresh token should be saved")
	})

	t.Run("Login_InvalidCredentials", func(t *testing.T) {
		// Register
		email := "wrongpass@example.com"
		_, err := client.Register(context.Background(), connect.NewRequest(&authv1.RegisterRequest{
			Email:       email,
			Password:    "correctpassword",
			FullName:    "Wrong Pass",
			PhoneNumber: "+15559999999",
			CountryCode: "US",
		}))
		require.NoError(t, err)

		// Login with wrong password
		loginReq := connect.NewRequest(&authv1.LoginRequest{
			Email:    email,
			Password: "wrongpassword",
		})
		_, err = client.Login(context.Background(), loginReq)
		require.Error(t, err)
		assert.Equal(t, connect.CodeUnauthenticated, connect.CodeOf(err))
	})
}
