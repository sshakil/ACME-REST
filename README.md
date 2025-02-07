# ACME REST API
Author: Saad Shakil
<br>https://sshakil.github.io

This is the ACME REST API for managing devices and sensors, allowing registration, retrieval, and real-time updates via WebSocket.

## Table of Contents

- [Installation](#installation)
- [API Usage](#api-usage)
    - [Device Management](#device-management)
        - [Get All Devices](#get-all-devices)
        - [Create a Device](#create-a-device)
        - [Delete a Device](#delete-a-device)
    - [Sensor Management](#sensor-management)
        - [Get All Sensors](#get-all-sensors)
        - [Update a Sensor](#update-a-sensor)
    - [Sensor Readings](#sensor-readings)
        - [Get Latest Sensor Readings](#get-latest-sensor-readings)
        - [Submit Sensor Readings](#submit-sensor-readings)
- [Database Schema](#database-schema)
- [Coding Principles](#coding-principles)
    - [Modular Design](#modular-design)
    - [Error Handling](#error-handling)
    - [Directory Structure](#directory-structure)
- [WebSocket Support](#websocket-support)
- [Next Steps](#next-steps)
- [License](#license)

## Installation

Ensure you have Node.js installed, then install dependencies:

```sh
npm install
```

Run the server:

```sh
npx nodemon src/index.js
```

## API Usage

### Device Management

#### Get All Devices

```sh
GET /devices
```

#### Create a Device

```sh
POST /devices
{
  "name": "Device1",
  "type": "sensor"
}
```

#### Delete a Device

```sh
DELETE /devices/:id
```

### Sensor Management

#### Get All Sensors

```sh
GET /sensors
```

#### Update a Sensor

```sh
POST /sensors/:id
{
  "unit": "Celsius"
}
```

### Sensor Readings

#### Get Latest Sensor Readings

```sh
GET /sensor-readings/:device_id
```

#### Submit Sensor Readings

```sh
POST /sensor-readings/:device_id
{
  "readings": [
    { "device_sensor_id": 1, "value": 23.5 },
    { "device_sensor_id": 2, "value": 19.8 },
    { "device_sensor_id": 3, "value": 45.2 }
  ]
}
```
[Back to top](#acme-rest-api)

## Database Schema

The database uses **Sequelize ORM** with a **PostgreSQL backend**. The schema consists of:

- **Devices**: Stores registered devices.
- **Sensors**: Defines sensor types and units.
- **Device-Sensors**: Maps sensors to devices (Many-to-Many).
- **Sensor Readings**: Stores readings, optimized with **TimescaleDB hypertables**.

## Coding Principles

### Modular Design

- Routes are structured per entity (`devices`, `sensors`, `sensorReadings`).
- Database interactions are handled through `service.js`.
- WebSocket events are encapsulated in `websocket.js`.

### Error Handling

- Middleware functions wrap async calls to avoid try/catch redundancy.
- Input validations ensure requests have required fields before processing.
- Database interactions use structured logging for tracking actions.

### Directory Structure

```
.
├── database
│   ├── connection.js
│   ├── models
│   │   ├── definitions.js
│   │   ├── service.js
│   │   └── migrations
│   └── setup
│       ├── check-db-util.js
│       ├── create-db.sql
├── src
│   ├── config.js
│   ├── index.js
│   ├── routes
│   │   ├── deviceSensors.js
│   │   ├── devices.js
│   │   ├── sensorReadings.js
│   │   ├── sensors.js
│   └── websocket.js
```

## WebSocket Support

WebSocket events are emitted on device and sensor updates:

- `device-created`
- `sensors-update`
- `sensor-readings`


## Next Steps

### Centralized WebSocket Event Naming
One potential improvement is extracting WebSocket event names into their own repository and library. This would allow:
- **Versioning of event names**, ensuring consistency across different deployments.
- **A single source of truth** for both the REST API and the UI that subscribes to these events.
- **Reduction of repetition**, preventing discrepancies between the backend and frontend event names.

### Potential Enhancements
- **Unit & Integration Testing**: Expanding test coverage for both API routes and database transactions.
- **API Documentation**: Using tools like Swagger/OpenAPI to document available endpoints.
- **Performance Optimizations**: Evaluating database indexing and caching strategies to improve response times.
- **Authentication & Authorization**: Implementing role-based access control (RBAC) to manage API permissions.

## License

This project is licensed under a private license for educational purposes and the author's skill-set evaluation for job or contract applications only. You may use, modify, and learn from the code provided here solely for your personal educational use or the evaluation of the author's skill-set during a job or contract application process. Redistribution, commercial use, or privately sharing of this code for any other purpose than identified or sharing it publicly in any form for any purpose is strictly prohibited without explicit permission from the author.

By using this software, you acknowledge that it is provided "as is" without any warranties, express or implied, including but not limited to fitness for a particular purpose. The author shall not be held liable for any damages, losses, or other consequences arising from the use or misuse of this software. You agree to indemnify and hold the author harmless from any claims, liabilities, or expenses related to your use of this software.

[Back to top](#acme-rest-api)
