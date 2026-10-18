import pytest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.workout_generator import generate_workout_plan


def test_generate_workout_plan_stub():
    """Phase 1 stub returns None. Real tests added in Phase 3."""
    result = generate_workout_plan({})
    assert result is None
