import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.ml_service import ml_service
from backend.app.models import User
from backend.app.security import create_access_token, get_password_hash

# Setup in-memory SQLite database for testing
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


class DummyTestModel:
    def __init__(self, val=100.0):
        self.val = val

    def predict(self, X):
        return [self.val] * len(X)


@pytest.fixture(scope="session", autouse=True)
def init_model():
    """Ensure ML model is loaded for test suite (mocking if in standby)."""
    if not ml_service.is_loaded:
        if not ml_service.load_model():
            ml_service.bundle = {
                "models": {
                    "expected_students": DummyTestModel(340.0),
                    "expected_food_required_kg": DummyTestModel(130.0),
                    "expected_food_wastage_kg": DummyTestModel(6.0),
                },
                "features": [
                    "day_of_week",
                    "is_weekend",
                    "is_holiday",
                    "exam_on_day",
                    "college_event",
                    "weather_condition",
                    "meal_type",
                    "main_menu_items",
                    "special_meal",
                    "mess_capacity_students",
                ],
                "targets": ["expected_students", "expected_food_required_kg", "expected_food_wastage_kg"],
                "version": "1.0.0-test",
                "capacity_default": 556,
            }
            ml_service.is_loaded = True
            ml_service.model_version = "1.0.0-test"



@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Override get_db with test database session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_user(db_session) -> User:
    """Create a primary test user in the test database."""
    user = User(
        username="messmanager1",
        email="manager@college.edu",
        full_name="Hostel Mess Manager",
        hashed_password=get_password_hash("ValidPass123!"),
        role="manager",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def auth_headers(test_user: User) -> dict:
    """JWT bearer headers for the primary test user."""
    token = create_access_token(data={"sub": str(test_user.id), "username": test_user.username, "role": test_user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def other_user(db_session) -> User:
    """Create a second user to test authorization and ownership separation."""
    user = User(
        username="othermanager",
        email="other@college.edu",
        full_name="Other Manager",
        hashed_password=get_password_hash("AnotherPass123!"),
        role="manager",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def other_auth_headers(other_user: User) -> dict:
    """JWT bearer headers for the second user."""
    token = create_access_token(data={"sub": str(other_user.id), "username": other_user.username, "role": other_user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def student_user(db_session) -> User:
    """Create a student user in the test database for role authorization tests."""
    user = User(
        username="student1",
        email="student1@college.edu",
        full_name="Hostel Student",
        hashed_password=get_password_hash("StudentPass123!"),
        role="student",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def student_auth_headers(student_user: User) -> dict:
    """JWT bearer headers for a student user."""
    token = create_access_token(data={"sub": str(student_user.id), "username": student_user.username, "role": student_user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def second_student_user(db_session) -> User:
    """Create a second student for isolation testing."""
    user = User(
        username="student2",
        email="student2@college.edu",
        full_name="Second Hostel Student",
        hashed_password=get_password_hash("StudentPass456!"),
        role="student",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def second_student_auth_headers(second_student_user: User) -> dict:
    """JWT bearer headers for the second student."""
    token = create_access_token(data={"sub": str(second_student_user.id), "username": second_student_user.username, "role": second_student_user.role})
    return {"Authorization": f"Bearer {token}"}
