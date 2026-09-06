"""Deterministic mathematical and scientific validation.

Nothing in a generated note may be labelled "verified" unless a *deterministic*
validator in this module actually passed. No language model is trusted here.

SymPy is used when it is installed (it gives symbolic equivalence, eigenvectors
and polynomial identities). When SymPy is absent the module falls back to exact
rational arithmetic implemented with :class:`fractions.Fraction`, which still
covers determinant, rank, inverse (AA-1 = I), eigenvalue/eigenvector residuals
(Av = lambda v), Cayley-Hamilton and numerical substitution checks.

Every result carries an explicit ``status``:

* ``verified``   - a deterministic check ran and passed
* ``failed``     - a deterministic check ran and failed
* ``not_run``    - the check could not be executed (unsupported input / missing
                   optional dependency). Never treat this as verified.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, asdict, field
from fractions import Fraction
from typing import Any, Sequence

try:  # optional, preferred
    import sympy as _sympy

    SYMPY_AVAILABLE = True
except Exception:  # pragma: no cover - environment dependent
    _sympy = None
    SYMPY_AVAILABLE = False

VERIFIED = "verified"
FAILED = "failed"
NOT_RUN = "not_run"

VALIDATOR_VERSION = "studyforge-math-validator/1.0"


@dataclass
class ValidationResult:
    check: str
    status: str
    detail: str = ""
    engine: str = field(default_factory=lambda: "sympy" if SYMPY_AVAILABLE else "exact-rational")
    data: dict[str, Any] = field(default_factory=dict)

    @property
    def passed(self) -> bool:
        return self.status == VERIFIED

    def to_dict(self) -> dict:
        payload = asdict(self)
        payload["validator_version"] = VALIDATOR_VERSION
        return payload


Matrix = Sequence[Sequence[Any]]


# ---------------------------------------------------------------------------
# exact rational helpers (SymPy-free fallback)
# ---------------------------------------------------------------------------


def _to_fraction_matrix(matrix: Matrix) -> list[list[Fraction]]:
    return [[Fraction(str(value)) for value in row] for row in matrix]


def _is_square(matrix: Matrix) -> bool:
    return bool(matrix) and all(len(row) == len(matrix) for row in matrix)


def _determinant(matrix: list[list[Fraction]]) -> Fraction:
    """Exact determinant via fraction-free Gaussian elimination."""

    size = len(matrix)
    work = [row[:] for row in matrix]
    det = Fraction(1)
    for col in range(size):
        pivot = None
        for row in range(col, size):
            if work[row][col] != 0:
                pivot = row
                break
        if pivot is None:
            return Fraction(0)
        if pivot != col:
            work[col], work[pivot] = work[pivot], work[col]
            det = -det
        det *= work[col][col]
        inv = Fraction(1) / work[col][col]
        for row in range(col + 1, size):
            factor = work[row][col] * inv
            if factor:
                work[row] = [a - factor * b for a, b in zip(work[row], work[col])]
    return det


def _rank(matrix: list[list[Fraction]]) -> int:
    work = [row[:] for row in matrix]
    rows, cols = len(work), len(work[0]) if work else 0
    rank = 0
    for col in range(cols):
        pivot = None
        for row in range(rank, rows):
            if work[row][col] != 0:
                pivot = row
                break
        if pivot is None:
            continue
        work[rank], work[pivot] = work[pivot], work[rank]
        inv = Fraction(1) / work[rank][col]
        work[rank] = [value * inv for value in work[rank]]
        for row in range(rows):
            if row != rank and work[row][col] != 0:
                factor = work[row][col]
                work[row] = [a - factor * b for a, b in zip(work[row], work[rank])]
        rank += 1
        if rank == rows:
            break
    return rank


def _multiply(a: list[list[Fraction]], b: list[list[Fraction]]) -> list[list[Fraction]]:
    inner = len(b)
    return [
        [sum((a[i][k] * b[k][j] for k in range(inner)), Fraction(0)) for j in range(len(b[0]))]
        for i in range(len(a))
    ]


def _identity(size: int) -> list[list[Fraction]]:
    return [[Fraction(1 if i == j else 0) for j in range(size)] for i in range(size)]


def _inverse(matrix: list[list[Fraction]]) -> list[list[Fraction]] | None:
    size = len(matrix)
    work = [row[:] + identity_row[:] for row, identity_row in zip(matrix, _identity(size))]
    for col in range(size):
        pivot = None
        for row in range(col, size):
            if work[row][col] != 0:
                pivot = row
                break
        if pivot is None:
            return None
        work[col], work[pivot] = work[pivot], work[col]
        inv = Fraction(1) / work[col][col]
        work[col] = [value * inv for value in work[col]]
        for row in range(size):
            if row != col and work[row][col] != 0:
                factor = work[row][col]
                work[row] = [a - factor * b for a, b in zip(work[row], work[col])]
    return [row[size:] for row in work]


def _char_poly_coeffs(matrix: list[list[Fraction]]) -> list[Fraction]:
    """Characteristic polynomial coefficients (Faddeev-LeVerrier), highest first."""

    size = len(matrix)
    coeffs = [Fraction(1)]
    current = _identity(size)
    for k in range(1, size + 1):
        current = _multiply(matrix, current)
        trace = sum((current[i][i] for i in range(size)), Fraction(0))
        coeff = -trace / k
        coeffs.append(coeff)
        for i in range(size):
            current[i][i] += coeff
    return coeffs


# ---------------------------------------------------------------------------
# public validators
# ---------------------------------------------------------------------------


def validate_determinant(matrix: Matrix, claimed: Any) -> ValidationResult:
    if not _is_square(matrix):
        return ValidationResult("determinant", NOT_RUN, "Matrix is not square.")
    try:
        exact = _determinant(_to_fraction_matrix(matrix))
        expected = Fraction(str(claimed))
    except (ValueError, ZeroDivisionError, ArithmeticError) as exc:
        return ValidationResult("determinant", NOT_RUN, f"Could not evaluate: {exc}")
    ok = exact == expected
    return ValidationResult(
        "determinant",
        VERIFIED if ok else FAILED,
        f"computed={exact}, claimed={expected}",
        data={"computed": str(exact), "claimed": str(expected)},
    )


def validate_rank(matrix: Matrix, claimed: int) -> ValidationResult:
    if not matrix:
        return ValidationResult("rank", NOT_RUN, "Empty matrix.")
    try:
        computed = _rank(_to_fraction_matrix(matrix))
    except (ValueError, ZeroDivisionError) as exc:
        return ValidationResult("rank", NOT_RUN, f"Could not evaluate: {exc}")
    ok = computed == int(claimed)
    return ValidationResult(
        "rank",
        VERIFIED if ok else FAILED,
        f"computed={computed}, claimed={claimed}",
        data={"computed": computed, "claimed": int(claimed)},
    )


def validate_inverse(matrix: Matrix, claimed_inverse: Matrix) -> ValidationResult:
    """Verify A * A^-1 = I exactly."""

    if not _is_square(matrix) or not _is_square(claimed_inverse) or len(matrix) != len(claimed_inverse):
        return ValidationResult("inverse", NOT_RUN, "Both matrices must be square and the same size.")
    try:
        a = _to_fraction_matrix(matrix)
        b = _to_fraction_matrix(claimed_inverse)
    except ValueError as exc:
        return ValidationResult("inverse", NOT_RUN, f"Non-rational entries: {exc}")
    product = _multiply(a, b)
    identity = _identity(len(a))
    ok = product == identity
    reverse_ok = _multiply(b, a) == identity
    return ValidationResult(
        "inverse",
        VERIFIED if (ok and reverse_ok) else FAILED,
        "AA^-1 = I verified" if ok and reverse_ok else "AA^-1 did not equal the identity matrix",
        data={"product": [[str(v) for v in row] for row in product]},
    )


def validate_eigenpair(matrix: Matrix, eigenvalue: Any, eigenvector: Sequence[Any], tolerance: float = 1e-9) -> ValidationResult:
    """Verify Av = lambda*v for the supplied pair."""

    if not _is_square(matrix) or len(eigenvector) != len(matrix):
        return ValidationResult("eigenpair", NOT_RUN, "Matrix must be square and match the vector length.")
    try:
        a = [[float(value) for value in row] for row in matrix]
        v = [float(value) for value in eigenvector]
        lam = float(eigenvalue)
    except (TypeError, ValueError) as exc:
        return ValidationResult("eigenpair", NOT_RUN, f"Non-numeric input: {exc}")
    if all(abs(value) < tolerance for value in v):
        return ValidationResult("eigenpair", FAILED, "Zero vector is never a valid eigenvector.")
    av = [sum(a[i][j] * v[j] for j in range(len(v))) for i in range(len(a))]
    lv = [lam * value for value in v]
    residual = max(abs(x - y) for x, y in zip(av, lv))
    scale = max(1.0, max(abs(value) for value in lv))
    ok = residual <= tolerance * scale * 10
    return ValidationResult(
        "eigenpair",
        VERIFIED if ok else FAILED,
        f"max|Av - lambda*v| = {residual:.3e}",
        data={"residual": residual, "Av": av, "lambda_v": lv},
    )


def validate_cayley_hamilton(matrix: Matrix) -> ValidationResult:
    """Substitute A into its own characteristic polynomial; expect the zero matrix."""

    if not _is_square(matrix):
        return ValidationResult("cayley_hamilton", NOT_RUN, "Matrix is not square.")
    try:
        a = _to_fraction_matrix(matrix)
    except ValueError as exc:
        return ValidationResult("cayley_hamilton", NOT_RUN, f"Non-rational entries: {exc}")
    size = len(a)
    coeffs = _char_poly_coeffs(a)
    # Horner evaluation with matrices: result = ((c0*A + c1*I)A + c2*I)A ...
    result = [[Fraction(0)] * size for _ in range(size)]
    for index, coeff in enumerate(coeffs):
        if index == 0:
            result = [[coeff if i == j else Fraction(0) for j in range(size)] for i in range(size)]
            continue
        result = _multiply(result, a)
        for i in range(size):
            result[i][i] += coeff
    zero = all(value == 0 for row in result for value in row)
    return ValidationResult(
        "cayley_hamilton",
        VERIFIED if zero else FAILED,
        "p(A) = 0 verified" if zero else "p(A) was not the zero matrix",
        data={
            "characteristic_coefficients": [str(c) for c in coeffs],
            "p_of_A": [[str(v) for v in row] for row in result],
        },
    )


def validate_equation_equivalence(left: str, right: str) -> ValidationResult:
    """Symbolic equivalence of two expressions. Requires SymPy."""

    if not SYMPY_AVAILABLE:
        return ValidationResult(
            "equation_equivalence",
            NOT_RUN,
            "SymPy is not installed in this environment; symbolic equivalence was not checked.",
            engine="unavailable",
        )
    try:
        difference = _sympy.simplify(_sympy.sympify(left) - _sympy.sympify(right))
    except Exception as exc:  # noqa: BLE001 - sympify raises many types
        return ValidationResult("equation_equivalence", NOT_RUN, f"Could not parse: {exc}")
    ok = difference == 0
    return ValidationResult(
        "equation_equivalence",
        VERIFIED if ok else FAILED,
        f"simplify(lhs - rhs) = {difference}",
        data={"difference": str(difference)},
    )


def validate_numeric_substitution(
    expression: str,
    values: dict[str, float],
    claimed: float,
    relative_tolerance: float = 1e-6,
) -> ValidationResult:
    """Evaluate ``expression`` with ``values`` and compare against ``claimed``.

    Evaluation is restricted to arithmetic plus the ``math`` module; no builtins
    are exposed, so this cannot execute arbitrary code from generated content.
    """

    allowed: dict[str, Any] = {name: getattr(math, name) for name in (
        "sqrt", "sin", "cos", "tan", "asin", "acos", "atan", "log", "log10", "exp", "pi", "e", "fabs", "pow",
    )}
    allowed.update({key: float(value) for key, value in values.items()})
    if any(token in expression for token in ("__", "import", "open(", "eval", "exec", "lambda")):
        return ValidationResult("numeric_substitution", NOT_RUN, "Expression rejected by the safety filter.")
    try:
        computed = float(eval(expression, {"__builtins__": {}}, allowed))  # noqa: S307 - sandboxed namespace
    except Exception as exc:  # noqa: BLE001
        return ValidationResult("numeric_substitution", NOT_RUN, f"Could not evaluate: {exc}")
    denominator = max(abs(computed), abs(float(claimed)), 1e-12)
    ok = abs(computed - float(claimed)) / denominator <= relative_tolerance
    return ValidationResult(
        "numeric_substitution",
        VERIFIED if ok else FAILED,
        f"computed={computed!r}, claimed={claimed!r}",
        data={"computed": computed, "claimed": float(claimed)},
    )


# Base SI dimensions used for dimensional analysis.
_BASE = ("m", "kg", "s", "A", "K", "mol", "cd")
_UNIT_DIMENSIONS: dict[str, dict[str, int]] = {
    "m": {"m": 1}, "km": {"m": 1}, "cm": {"m": 1}, "mm": {"m": 1},
    "kg": {"kg": 1}, "g": {"kg": 1},
    "s": {"s": 1}, "ms": {"s": 1}, "min": {"s": 1}, "h": {"s": 1},
    "A": {"A": 1}, "K": {"K": 1}, "mol": {"mol": 1}, "cd": {"cd": 1},
    "N": {"kg": 1, "m": 1, "s": -2},
    "J": {"kg": 1, "m": 2, "s": -2},
    "W": {"kg": 1, "m": 2, "s": -3},
    "Pa": {"kg": 1, "m": -1, "s": -2},
    "C": {"A": 1, "s": 1},
    "V": {"kg": 1, "m": 2, "s": -3, "A": -1},
    "ohm": {"kg": 1, "m": 2, "s": -3, "A": -2},
    "Hz": {"s": -1},
}
_SCALE: dict[str, float] = {"km": 1000.0, "cm": 0.01, "mm": 0.001, "g": 0.001, "ms": 0.001, "min": 60.0, "h": 3600.0}


def dimensions_of(unit: str) -> dict[str, int] | None:
    """Parse a simple unit string such as ``kg*m/s^2`` into base dimensions."""

    if not unit or unit.strip() in {"1", "-", "dimensionless"}:
        return {}
    result: dict[str, int] = {}
    numerator, _, denominator = unit.replace(" ", "").partition("/")

    def accumulate(part: str, sign: int) -> bool:
        if not part:
            return True
        for factor in part.split("*"):
            if not factor:
                continue
            symbol, _, power = factor.partition("^")
            exponent = int(power) if power else 1
            base = _UNIT_DIMENSIONS.get(symbol)
            if base is None:
                return False
            for key, value in base.items():
                result[key] = result.get(key, 0) + sign * value * exponent
        return True

    if not accumulate(numerator, 1) or not accumulate(denominator, -1):
        return None
    return {key: value for key, value in result.items() if value}


def validate_dimensions(left_unit: str, right_unit: str) -> ValidationResult:
    left = dimensions_of(left_unit)
    right = dimensions_of(right_unit)
    if left is None or right is None:
        return ValidationResult("dimensions", NOT_RUN, "Unit string contained an unknown symbol.")
    ok = left == right
    return ValidationResult(
        "dimensions",
        VERIFIED if ok else FAILED,
        f"{left_unit} -> {left}; {right_unit} -> {right}",
        data={"left": left, "right": right},
    )


def convert_to_si(value: float, unit: str) -> float:
    return float(value) * _SCALE.get(unit, 1.0)


def validate_reasonableness(value: float, low: float, high: float, label: str = "value") -> ValidationResult:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return ValidationResult("reasonableness", NOT_RUN, "Non-numeric result.")
    if math.isnan(numeric) or math.isinf(numeric):
        return ValidationResult("reasonableness", FAILED, "Result is not a finite number.")
    ok = low <= numeric <= high
    return ValidationResult(
        "reasonableness",
        VERIFIED if ok else FAILED,
        f"{label}={numeric} expected within [{low}, {high}]",
        data={"value": numeric, "low": low, "high": high},
    )


# ---------------------------------------------------------------------------
# nine-step solved numerical
# ---------------------------------------------------------------------------

NUMERICAL_STEPS = (
    "given_data",
    "required_quantity",
    "formula",
    "unit_conversion",
    "substitution",
    "intermediate_calculation",
    "final_answer",
    "unit_dimensional_check",
    "reasonableness_check",
)


def validate_solved_numerical(numerical: dict) -> dict:
    """Validate one solved numerical and return it enriched with results.

    ``numerical`` is expected to contain the nine presentation steps plus the
    machine-checkable fields ``expression``, ``values``, ``answer_value``,
    ``answer_unit`` and optionally ``formula_unit`` / ``plausible_range``.
    """

    results: list[ValidationResult] = []
    missing = [step for step in NUMERICAL_STEPS if not str(numerical.get(step, "")).strip()]
    results.append(
        ValidationResult(
            "nine_step_completeness",
            VERIFIED if not missing else FAILED,
            "All nine steps present" if not missing else f"Missing steps: {', '.join(missing)}",
            engine="structural",
            data={"missing": missing},
        )
    )

    expression = numerical.get("expression")
    values = numerical.get("values") or {}
    answer = numerical.get("answer_value")
    if expression and answer is not None:
        results.append(validate_numeric_substitution(str(expression), dict(values), float(answer)))
    else:
        results.append(ValidationResult("numeric_substitution", NOT_RUN, "No machine-checkable expression supplied."))

    if numerical.get("formula_unit") and numerical.get("answer_unit"):
        results.append(validate_dimensions(str(numerical["formula_unit"]), str(numerical["answer_unit"])))
    else:
        results.append(ValidationResult("dimensions", NOT_RUN, "No unit pair supplied."))

    plausible = numerical.get("plausible_range")
    if plausible and answer is not None:
        results.append(validate_reasonableness(float(answer), float(plausible[0]), float(plausible[1])))
    else:
        results.append(ValidationResult("reasonableness", NOT_RUN, "No plausible range supplied."))

    enriched = dict(numerical)
    enriched["validations"] = [result.to_dict() for result in results]
    enriched["verified"] = all(result.passed for result in results)
    enriched["validator_version"] = VALIDATOR_VERSION
    return enriched


def summarise(results: Sequence[ValidationResult | dict]) -> dict:
    """Aggregate counts for persistence and for the notes 'validation' section."""

    counts = {VERIFIED: 0, FAILED: 0, NOT_RUN: 0}
    for item in results:
        status = item.status if isinstance(item, ValidationResult) else item.get("status", NOT_RUN)
        counts[status] = counts.get(status, 0) + 1
    return {
        "validator_version": VALIDATOR_VERSION,
        "engine": "sympy" if SYMPY_AVAILABLE else "exact-rational",
        "sympy_available": SYMPY_AVAILABLE,
        "counts": counts,
        "all_verified": counts[FAILED] == 0 and counts[VERIFIED] > 0,
    }
