# RuralLink

## AI-Powered Rural Delivery Platform

RuralLink is a full-stack rural logistics platform for customer order placement, delivery prioritization, route planning and driver delivery management.

It combines customer orders, delivery priorities, vehicle constraints, route optimization and offline driver operations in one system.

RuralLink is designed for remote and underserved areas where logistics may be affected by:

- Poor or changing road conditions.
- Limited vehicle availability.
- Small and scattered shipments.
- Perishable goods.
- Urgent medicine or essential-goods deliveries.
- Unreliable internet connectivity.
- Inefficient manual allocation.
- Repeated deprioritization of small producers and vulnerable communities.

The platform is intended to act as a logistics coordination layer. It does not initially require the project team to own a complete delivery fleet.

---

## Key Idea

Conventional logistics systems often optimize for distance, cost and delivery speed. This can result in remote, low-volume or vulnerable users being served less frequently.

RuralLink adds a coordination and decision-support layer that considers:

- Shipment urgency.
- Product perishability.
- Vehicle capacity.
- Estimated delivery time.
- Delay risk.
- Road-based route geometry.
- Driver availability.
- Offline operation.
- Fairness in allocation.

```text
Customer / Producer
        ↓
Order and priority registration
        ↓
RuralLink allocation and route engine
        ↓
Driver PWA + vehicle assignment
        ↓
Delivery, offline updates and synchronization
```

---

## Main Features

### Customer Order Portal

- Place delivery orders.
- Submit natural-language order messages.
- View order status.
- Receive priority and ETA information.
- Track delivery progress.
- Use customer-facing delivery workflows.

### AI-Assisted Message Parsing

- Parses natural-language order messages using Google Gemini when configured.
- Extracts relevant order information.
- Supports an offline keyword-based fallback parser when Gemini is unavailable.
- Keeps parsing separate from final delivery allocation.

### Delivery Prioritization

- Predicts delivery priority.
- Considers urgency and order information.
- Estimates ETA.
- Predicts delay risk.
- Supports machine-learning-based prediction through the backend ML service.
- Falls back safely when optional prediction services are unavailable.

### Route Optimization

- Uses Google OR-Tools for route optimization.
- Considers delivery sequence and vehicle routing.
- Supports optional OpenRouteService road routing.
- Uses a clearly labelled straight-line routing fallback if OpenRouteService is unavailable.
- Supports route planning for driver deliveries.

### Driver Progressive Web App

- Driver login.
- Assigned delivery list.
- Delivery status updates.
- GPS location updates.
- Route map.
- Offline delivery-status storage.
- Offline GPS storage.
- Automatic synchronization after connectivity returns.
- Progressive Web App installation support.

### Backend API

- FastAPI REST API.
- Automatic API documentation through Swagger UI.
- Health-check endpoint.
- Order management.
- Driver management.
- Route planning.
- Prediction endpoints.
- Offline synchronization support.

### Deployment

- Docker support.
- Render deployment configuration.
- `render.yaml` Blueprint configuration.
- Local development support.
- Optional external Gemini and OpenRouteService integrations.

---

## Target Users

### Primary Users

- Rural customers.
- Small producers.
- FPOs and SHGs.
- Local delivery operators.
- Drivers and vehicle owners.
- Community pickup-point operators.
- NGOs.
- Government logistics programs.
- Rural retailers and processors.

### Platform Operators

- Dispatchers.
- Fleet managers.
- Administrators.
- FPO coordinators.
- NGO or government logistics coordinators.

### Beneficiaries

- Remote households.
- Small-volume producers.
- Patients requiring urgent medicines.
- Elderly and vulnerable users.
- Rural consumers.
- Communities with poor road or internet access.

---

## Application URLs

The following URLs are available when running the application locally.

| Service | URL |
|---|---|
| Customer Portal | [http://127.0.0.1:8000/](http://127.0.0.1:8000/) |
| Driver PWA | [http://127.0.0.1:8000/driver/](http://127.0.0.1:8000/driver/) |
| API Documentation | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) |
| Health Check | [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) |

The frontend must be built before starting the FastAPI application locally.

---

## Complete Workflow

```text
Customer or producer registers an order
                ↓
Natural-language message is parsed
                ↓
Order details are validated
                ↓
Delivery priority, ETA and delay risk are predicted
                ↓
Pending orders are collected
                ↓
Available drivers and delivery resources are identified
                ↓
Route is optimized using OR-Tools
                ↓
Road-based geometry is requested when available
                ↓
Driver receives the assigned route
                ↓
Driver performs delivery through the PWA
                ↓
Events are stored locally if offline
                ↓
GPS and delivery updates synchronize after reconnection
                ↓
Customer and dispatcher receive updated status
                ↓
System records delivery and performance metrics
```

---

## Offline Workflow

The driver PWA is designed to continue operating during temporary network loss.

### Before Going Offline

The application can download or cache:

- Assigned deliveries.
- Route information.
- Delivery details.
- Driver information.
- Map and route data.
- Required delivery actions.

### During Offline Operation

The driver can:

- View assigned deliveries.
- View the cached route.
- Update delivery status.
- Store GPS locations.
- Add delivery notes.
- Continue the delivery workflow.

### After Connectivity Returns

The application:

1. Detects network availability.
2. Uploads pending local events.
3. Synchronizes GPS updates.
4. Updates delivery status in the backend.
5. Handles duplicate or already-synchronized events.
6. Refreshes the dispatcher and customer views.

The prototype uses local storage for offline events. Production deployment should add stronger conflict handling, encrypted local storage and device-level security.

---

## Technology Stack

### Frontend

- React
- Vite
- Tailwind CSS
- React Router
- Axios
- Leaflet
- React Leaflet
- Vite PWA

### Backend

- Python 3.12
- FastAPI
- Uvicorn
- SQLite
- Scikit-learn
- Google OR-Tools
- Google Gemini API
- OpenRouteService API

### Deployment

- Docker
- Render
- Render Blueprint through `render.yaml`

---

## Project Structure

```text
RuralLink/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── gemini_service.py
│   │   ├── ml_service.py
│   │   ├── route_optimizer.py
│   │   └── routing_service.py
│   │
│   ├── models/
│   │   └── artifacts.joblib
│   │
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── Dockerfile
├── render.yaml
└── README.md
```

---

## Requirements

Install the following software before running locally:

- Python 3.12.
- Node.js 22 or later.
- npm.
- Git.
- Docker Desktop, optional for container deployment.

Python 3.12 is recommended for dependency compatibility.

---

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Avinab-45/RuralLink-App-SOAIDEATHON26.git
cd RuralLink-App-SOAIDEATHON26
```

### 2. Build the Frontend

```bash
cd frontend
npm ci
npm run build
cd ..
```

The build output must be generated before starting FastAPI because the backend serves the built frontend application.

### 3. Create the Python Virtual Environment

#### Windows PowerShell

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

#### Linux or macOS

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Create the Environment File

#### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

#### Linux or macOS

```bash
cp .env.example .env
```

Update the values in `backend/.env` if you want to enable optional external services.

### 5. Start the Application

From the `backend` directory:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open the customer portal:

```text
http://127.0.0.1:8000/
```

Open the driver PWA:

```text
http://127.0.0.1:8000/driver/
```

Open API documentation:

```text
http://127.0.0.1:8000/docs
```

Check application health:

```text
http://127.0.0.1:8000/health
```

---

## Environment Variables

Create this file locally:

```text
backend/.env
```

Example:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL_NAME=gemini-3.7-flash

ORS_API_KEY=your_openrouteservice_api_key
ORS_BASE_URL=https://api.openrouteservice.org

DATABASE_PATH=./rurallink.db
```

### Environment Variable Details

| Variable | Required | Description |
|---|---:|---|
| `GEMINI_API_KEY` | No | Enables Gemini-based natural-language order parsing |
| `GEMINI_MODEL_NAME` | No | Gemini model name; defaults to `gemini-3.7-flash` |
| `ORS_API_KEY` | No | Enables OpenRouteService road-based route geometry |
| `ORS_BASE_URL` | No | OpenRouteService API endpoint |
| `DATABASE_PATH` | No | Custom SQLite database location |

### Fallback Behavior

If `GEMINI_API_KEY` is unavailable:

- The system uses an offline keyword-based parser.

If `ORS_API_KEY` is unavailable:

- The system uses a clearly labelled straight-line routing fallback.

Optional external services should not prevent the basic application from starting.

---

## Docker

### Build the Docker Image

From the repository root:

```powershell
docker build --no-cache -t rurallink .
```

### Run the Container

Windows PowerShell:

```powershell
docker run --rm --name rurallink -p 8000:8000 --env-file .\backend\.env rurallink
```

Linux or macOS:

```bash
docker run --rm \
  --name rurallink \
  -p 8000:8000 \
  --env-file ./backend/.env \
  rurallink
```

Open:

```text
http://127.0.0.1:8000/
```

---

## Render Deployment

This repository includes:

```text
Dockerfile
render.yaml
```

The Render Blueprint describes the deployment configuration as infrastructure-as-code. Render supports Blueprint files for defining and deploying services from a repository.

### Deployment Steps

1. Push the repository to GitHub.
2. Open the Render Dashboard.
3. Select **New +**.
4. Select **Blueprint**.
5. Connect the GitHub repository.
6. Allow Render to detect `render.yaml`.
7. Add optional environment variables.
8. Deploy the service.
9. Open the generated Render URL.
10. Verify `/health`, `/docs`, `/` and `/driver/`.

### Render Environment Variables

Add these through the Render Dashboard:

```text
GEMINI_API_KEY
GEMINI_MODEL_NAME
ORS_API_KEY
ORS_BASE_URL
DATABASE_PATH
```

---


## API Endpoints

The following endpoints are available in the current API.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Application health status |
| `POST` | `/parse-message` | Parse a natural-language order |
| `POST` | `/predict` | Predict delivery priority, ETA and delay risk |
| `POST` | `/optimize-route` | Optimize a delivery route |
| `POST` | `/api/orders` | Create a customer order |
| `GET` | `/api/orders` | List customer orders |
| `POST` | `/api/orders/plan` | Plan saved customer orders |
| `POST` | `/api/driver/login` | Driver login |
| `GET` | `/api/driver/{driver_id}/deliveries` | Get driver deliveries |
| `GET` | `/api/driver/{driver_id}/route` | Get driver route |
| `POST` | `/api/driver/{driver_id}/location` | Update driver GPS location |
| `PATCH` | `/api/driver/deliveries/{delivery_id}/status` | Update delivery status |

Interactive API documentation is available at:

```text
http://127.0.0.1:8000/docs
```

---

## Route Optimization

RuralLink uses Google OR-Tools for route optimization.

The route-planning process considers:

- Delivery locations.
- Delivery sequence.
- Available orders.
- Driver assignments.
- Estimated travel time.
- Route distance.
- Order priority.
- Delivery deadlines.
- Delay risk.
- Vehicle or driver constraints supported by the current implementation.

When configured, OpenRouteService provides road-based route geometry. When it is unavailable, the system uses a clearly labelled straight-line fallback for demonstration purposes.

---

## AI and Machine Learning

RuralLink uses AI and machine learning selectively.

### Gemini

Gemini is used for:

- Natural-language order parsing.
- Extracting structured delivery information from customer messages.

If Gemini is unavailable, the system falls back to keyword-based parsing.

### Machine Learning

The ML service supports predictions for:

- Delivery priority.
- Estimated arrival time.
- Delay risk.

The trained model artifact is stored at:

```text
backend/models/artifacts.joblib
```


### Deterministic Operations


The final route respect:

- Available resources.
- Delivery feasibility.
- Route constraints.
- Driver and vehicle status.
- Capacity.
- Operational rules.

---

## Driver PWA Features

The Driver PWA provides:

- Driver login.
- Assigned delivery list.
- Delivery details.
- Delivery-status updates.
- GPS tracking.
- Route visualization.
- Offline delivery-status storage.
- Offline GPS storage.
- Automatic synchronization.
- PWA installation support.

---

## Rural Logistics Workflow

```text
1. Customer or producer submits an order.
2. The order is parsed and validated.
3. Priority, ETA and delay risk are predicted.
4. Saved orders are loaded into the planning process.
5. Route optimization generates a delivery sequence.
6. The driver receives assigned deliveries.
7. The driver follows the route.
8. The driver updates delivery status.
9. Events are stored locally during network loss.
10. Events synchronize when connectivity returns.
11. The customer and dispatcher receive updated status.
12. Delivery performance is recorded for evaluation.
```

---

## Current Project Status


| Module | Status |
|---|---|
| Customer order portal | Complete |
| Driver PWA | Complete |
| FastAPI backend | Complete |
| Gemini message parsing | Complete |
| Offline keyword parser | Complete |
| ML priority prediction | Complete |
| ML ETA prediction | Complete |
| ML delay-risk prediction | Complete |
| OR-Tools route optimization | Complete |
| Straight-line fallback routing | Complete |
| Offline delivery updates | Complete |
| Offline GPS storage | Complete |
| Automatic synchronization | Complete |
| Docker deployment | Complete |
| Render deployment | Complete |

---

## Demo Scenario

A recommended demonstration scenario is:

1. Open the customer portal.
2. Submit a normal delivery order.
3. Submit an urgent or perishable order.
4. Show the parsed order details.
5. Open the prediction result.
6. Plan saved orders.
7. Show the optimized route.
8. Open the Driver PWA.
9. Login as a driver.
10. View assigned deliveries.
11. Enable offline mode or simulate network loss.
12. Update a delivery status.
13. Show that the status is stored locally.
14. Restore connectivity.
15. Show automatic synchronization.
16. Open the route map and GPS status.
17. Check the API health endpoint.
18. Open Swagger UI and demonstrate the available endpoints.

---

## Testing

Run backend tests, if available:

```bash
cd backend
pytest
```

Run frontend tests, if configured:

```bash
cd frontend
npm test
```

Test the application manually using:

```text
http://127.0.0.1:8000/health
http://127.0.0.1:8000/docs
http://127.0.0.1:8000/
http://127.0.0.1:8000/driver/
```

### Important Test Scenarios

- Customer creates a valid order.
- Invalid order data is rejected.
- Natural-language message is parsed.
- Keyword fallback works without Gemini.
- Route optimization works without OpenRouteService.
- Saved orders can be planned.
- Driver can login.
- Driver can view deliveries.
- Driver can update delivery status.
- Offline status is stored locally.
- GPS updates are stored locally.
- Synchronization works after reconnecting.
- Duplicate synchronization events are handled.
- Health check returns a successful response.

---

## Data and Deployment Limitations

- SQLite may not persist reliably on an ephemeral deployment.
- Gemini and OpenRouteService require external API credentials.
- Straight-line routing is only a fallback and does not represent road travel.
- ML predictions depend on the quality and representativeness of training data.
- GPS updates may be simulated or browser-dependent.
- Offline synchronization is prototype-level unless conflict resolution is fully implemented.
- The current application may not support full multi-fleet allocation.
- A live deployment should use persistent storage and monitoring.
- Medical and cold-chain deliveries require additional compliance, verification and physical monitoring in production.

---

## Future Scope

- PostgreSQL and PostGIS for production deployment.
- Multi-vehicle and multi-fleet coordination.
- Community pickup-point management.
- Explicit fairness-aware allocation.
- Perishability-aware scheduling.
- Road-condition reporting.
- Dynamic rerouting after road blockage.
- Vehicle capacity constraints.
- Temperature and cold-chain sensors.
- SMS and IVR support.
- Regional-language and voice interfaces.
- Better ETA and demand prediction.
- Government, NGO and FPO integrations.
- Persistent deployment database.
- Advanced audit and fairness analytics.
- Scalable cloud deployment.

---

## Repository Structure

```text
RuralLink-App-SOAIDEATHON26/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── gemini_service.py
│   │   ├── ml_service.py
│   │   ├── route_optimizer.py
│   │   └── routing_service.py
│   │
│   ├── models/
│   │   └── artifacts.joblib
│   │
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── docs/
├── screenshots/
├── diagrams/
├── tests/
├── Dockerfile
├── render.yaml
├── .gitignore
└── README.md
```

---


## Third-Party Attribution

This project may use third-party services, libraries and data, including:

- React.
- FastAPI.
- Scikit-learn.
- Google OR-Tools.
- Google Gemini API.
- OpenRouteService.
- Leaflet.
- OpenStreetMap data, if used.

Check and retain the license and attribution requirements of every third-party dependency used by the actual implementation.

If OpenStreetMap data is used, include the required attribution:

```text
Map data © OpenStreetMap contributors.
```

See the [OpenStreetMap copyright and license information](https://www.openstreetmap.org/copyright).

---


## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [FastAPI Deployment Documentation](https://fastapi.tiangolo.com/deployment/)
- [Google OR-Tools Routing Documentation](https://developers.google.com/optimization/routing)
- [Google Gemini API Documentation](https://ai.google.dev/)
- [OpenRouteService Documentation](https://openrouteservice.org/dev/)
- [Leaflet Documentation](https://leafletjs.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vite.dev/)
- [Render Blueprint Documentation](https://render.com/docs/blueprint-spec)
- [Docker FastAPI Examples](https://docs.docker.com/reference/samples/fastapi/)
- [OpenStreetMap Copyright and License](https://www.openstreetmap.org/copyright)
- [PostGIS Documentation](https://postgis.net/documentation/)

---

## Acknowledgement

RuralLink was developed as an academic prototype for SOAIDEATHON 2026.

The platform demonstrates how AI-assisted parsing, machine-learning predictions, route optimization and offline-first driver workflows can be combined to improve rural delivery coordination.
