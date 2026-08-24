import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _load_local_env() -> None:
    """Load backend/.env without adding another runtime dependency.

    Environment variables supplied by deployment platforms always win over the
    local file, so production secrets can still be managed normally.
    """
    env_file = PROJECT_ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_local_env()

# Set this in your environment before starting the server, e.g.
#   export GEMINI_API_KEY="your-key-here"       (Linux/Mac)
#   setx GEMINI_API_KEY "your-key-here"          (Windows)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL_NAME = os.environ.get("GEMINI_MODEL_NAME", "gemini-2.5-flash")

# Create a free key at https://openrouteservice.org/dev/#/signup and keep it
# outside source control.  Without it, the app remains usable in explicit
# fallback mode, but cannot claim road-accurate routes.
ORS_API_KEY = os.environ.get("ORS_API_KEY", "")
ORS_BASE_URL = os.environ.get("ORS_BASE_URL", "https://api.openrouteservice.org")

MODEL_ARTIFACT_PATH = os.environ.get("MODEL_ARTIFACT_PATH", str(PROJECT_ROOT / "models" / "artifacts.joblib"))

# Rough village coordinate lookup used only when the incoming message doesn't
# include GPS coordinates. Replace with a real geocoding service / DB table
# in production.
KNOWN_VILLAGE_COORDS = {
     "bhubaneswar": (20.2961, 85.8245),
    "cuttack": (20.4625, 85.8830),
    "puri": (19.8135, 85.8312),
    "pipili": (20.1200, 85.8300),
    "konark": (19.8876, 86.0945),
    "nimapada": (20.0578, 86.0046),
    "khordha": (20.1826, 85.6170),
    "jatni": (20.1598, 85.7073),
    "balugaon": (19.7170, 85.2180),
    "kakatpur": (19.9880, 86.1170),
    "brahmagiri": (19.7910, 85.6140),
    "satyabadi": (19.9650, 85.8470),
    "jagatsinghpur": (20.2549, 86.1706),
    "kendrapara": (20.5013, 86.4227),
    "paradeep": (20.3167, 86.6167),
    "bhadrak": (21.0583, 86.4963),
    "balasore": (21.4934, 86.9135),
    "baripada": (21.9322, 86.7214),
    "dhenkanal": (20.6610, 85.5960),
    "angul": (20.8444, 85.1511),
    "talcher": (20.9500, 85.2333),
    "nayagarh": (20.1231, 85.1045),
    "berhampur": (19.3150, 84.7941),
    "gopalpur": (19.2640, 84.9050),
    "sambalpur": (21.4669, 83.9812),
    "bargarh": (21.3333, 83.6167),
    "jharsuguda": (21.8554, 84.0062),
    "rourkela": (22.2604, 84.8536),
    "rayagada": (19.1712, 83.4163),
    "koraput": (18.8135, 82.7123),
    "jeypore": (18.8563, 82.5716),
    "ganganagar": (20.2649, 85.8217),
    "unit 1": (20.2615, 85.8319),
    "unit 2": (20.2600, 85.8370),
    "unit 3": (20.2538, 85.8380),
    "unit 4": (20.2600, 85.8270),
    "unit 5": (20.2670, 85.8240),
    "unit 6": (20.2648, 85.8234),
    "unit 7": (20.2690, 85.8200),
    "unit 8": (20.2740, 85.8230),
    "unit 9": (20.2810, 85.8300),
    "saheed nagar": (20.2901, 85.8465),
    "vani vihar": (20.2890, 85.8400),
    "bapuji nagar": (20.2598, 85.8315),
    "ashok nagar": (20.2630, 85.8370),
    "old town": (20.2400, 85.8340),
    "bj b nagar": (20.2460, 85.8330),
    "nayapalli": (20.2870, 85.8110),
    "irc village": (20.2870, 85.8070),
    "jayadev vihar": (20.2943, 85.8220),
    "acharya vihar": (20.2950, 85.8360),
    "chandrasekharpur": (20.3280, 85.8240),
    "niladri vihar": (20.3270, 85.8360),
    "patia": (20.3520, 85.8180),
    "rasulgarh": (20.2990, 85.8720),
    "mancheswar": (20.3218, 85.8449),
    "jharpada": (20.2690, 85.8690),
    "laxmisagar": (20.2700, 85.8560),
    "vss nagar": (20.2930, 85.8530),
    "baramunda": (20.2580, 85.7990),
    "khandagiri": (20.2597, 85.7899),
    "jagamara": (20.2490, 85.7870),
    "gothapatna": (20.2600, 85.7520),
    "dumduma": (20.2420, 85.7850),
    "tamando": (20.2420, 85.7510),
    "pokhariput": (20.2380, 85.8010),
    "sundarpada": (20.2120, 85.7960),
    "kapila prasad": (20.1840, 85.7895),
    "patrapada": (20.2130, 85.7730),
    "lingaraj area": (20.2390, 85.8330),
    "andharua": (20.3500, 85.7900),
    "daruthenga": (20.3678, 85.7839),
    "chandaka village": (20.3669, 85.7672),
    "rampur": (20.3550, 85.8050),
    "rathipur": (20.3450, 85.7900),
    "barimunda": (20.3660, 85.8250),
    "rghunathpur": (20.3900, 85.8420),
    "jagannathpur": (20.2264, 85.9483),
    "paikarapur": (20.2260, 85.8200),
    "gopinathpur": (20.2150, 85.8050),
    "nuagaon": (20.2780, 85.7710),
    "sankarpur": (20.2870, 85.7730),
    "mendhasal": (20.3350, 85.7350),
    "kantilo (Bhubaneswar locality)": (20.2048, 85.7936),
    "argul": (20.2600, 85.7100),
    "janla": (20.2330, 85.7000),
    "mahura": (20.2350, 85.6800),
    "jokalandi": (20.3050, 85.7850),
    "chhatabar": (20.3770, 85.7780),
    "chandanpur": (19.9560, 85.8310)
}
DEFAULT_COORDS = (20.9517, 85.0985)  # Odisha region centroid, used as a fallback
