from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import User
from backend.app.schemas import (
    MessageResponse,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
)
from backend.app.security import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new mess manager account",
)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user account with hashed password.
    Returns access token and safe user details upon successful registration.
    """
    # Check if username already exists
    existing_user = db.query(User).filter(User.username.ilike(user_in.username.strip())).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this username already exists.",
        )

    # Check if email already exists
    existing_email = db.query(User).filter(User.email.ilike(user_in.email.strip())).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Create user with bcrypt password hash
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        username=user_in.username.strip(),
        email=user_in.email.strip().lower(),
        full_name=user_in.full_name.strip() if user_in.full_name else None,
        hashed_password=hashed_pwd,
        role=user_in.role or "manager",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate JWT token
    access_token = create_access_token(data={"sub": str(user.id), "username": user.username, "role": user.role})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user and obtain JWT access token",
)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Verify username/email and password credentials.
    Returns JWT access token with bearer scheme.
    """
    query_str = credentials.username_or_email.strip()
    user = db.query(User).filter(
        (User.username.ilike(query_str)) | (User.email.ilike(query_str))
    ).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your username/email and password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact the system administrator.",
        )

    access_token = create_access_token(data={"sub": str(user.id), "username": user.username, "role": user.role})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
)
def get_me(current_user: User = Depends(get_current_user)):
    """Return authenticated user profile details safely without exposing password hashes."""
    return UserResponse.model_validate(current_user)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Clear client session",
)
def logout(current_user: User = Depends(get_current_user)):
    """
    Stateless JWT logout:
    Tokens are stateless cryptographic signatures; logging out instructs the client to discard
    the stored token from client storage (localStorage / memory).
    """
    return MessageResponse(
        message="Logged out successfully. Please remove stored authentication tokens on the client."
    )
