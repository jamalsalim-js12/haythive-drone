# HaytHive POC — Project Scope

**Project:** HaytHive Autonomous Drone Docking & Security System  
**Type:** Proof of Concept (POC)  
**Prepared for:** IoTeedom Technical Team  
**Context:** Saturday Technical Meeting — August 2026

---

## Purpose

Build and demonstrate a functional proof of concept that:

- Securely houses a Drone UAV
- Opens and closes automatically
- Raises and lowers the landing platform
- Supports charging and readiness checks
- Enables event-triggered deployment, monitoring, return, and recovery

---

## 1. POC System Scope

### Enclosure & mechanical

- Weather-resistant enclosure sized to fully contain the selected POC UAV, docking platform, charging interface, control equipment, and required safety clearances
- Final dimensions confirmed during the CAD and engineering phase
- Motorized top lid/hatch with:
  - Safe open/close control
  - Position sensing
  - Manual override
  - Obstruction protection
- Landing platform behavior:
  - Remains **lowered** when the lid is closed (UAV fits inside)
  - **Raises** for launch/landing
  - **Lowers** for storage

### Docking, power & environment

- Drone docking alignment
- Battery charging interface
- Ventilation / environmental management

### Security & awareness

- Security sensors
- Cameras
- Lighting
- Siren
- Communications

### Control & software workflow

End-to-end operational flow:

**Alert → validation → authorization → deployment → live monitoring → return → docking → readiness restoration**

---

## 2. Initial POC Success Criteria

| #   | Criterion                                                                                  |
| --- | ------------------------------------------------------------------------------------------ |
| 1   | Repeatable automated lid and platform movement with safe limit controls                    |
| 2   | Reliable launch/landing access and return-to-dock demonstration                            |
| 3   | Basic charging/readiness status and system-health reporting                                |
| 4   | Demonstrated event alert, remote command, video/telemetry viewing, and operational logging |

---

## 3. Support Requested from IoTeedom

1. Review overall architecture and recommend a practical POC control stack, sensors, motor/actuator interfaces, communications, and software approach.
2. Map how enclosure hardware, UAV, controller, mobile/web interface, cloud services, alerts, and data logging communicate.
3. Identify integration risks, required specialists, estimated development phases, and a realistic testing/validation plan.
4. Help define a **minimum viable POC** first, with optional advanced features scheduled for later phases.

---

## 4. Meeting Objectives

- Confirm the POC boundary, core demonstration scenario, and technical assumptions
- Agree on division of responsibilities between HaytHive and IoTeedom
- Identify required drawings, CAD interfaces, component specifications, APIs, and other information needed to begin
- Establish next deliverables: architecture diagram, work breakdown, preliminary schedule, cost range, and technical proposal

---

## 5. Working Constraints

- **HaytHive** coordinates enclosure design, component procurement, and hands-on installation with its team and selected engineering support.
- The first build prioritizes **functionality, safety, modularity, service access, and budget** — not final production appearance.
- Detailed patent claims, source files, credentials, and sensitive architecture are shared only as needed under the existing NDA and controlled access.

---

## Expected Outputs (Post-Meeting)

| #   | Deliverable                       |
| --- | --------------------------------- |
| 01  | System architecture               |
| 02  | MVP scope & responsibilities      |
| 03  | Schedule & budget range           |
| 04  | Technical proposal / next actions |

---

## Scope Summary (MVP Focus)

**In scope for the first POC**

- Enclosure with motorized lid and raise/lower platform
- Docking alignment and charging interface
- Core sensors, cameras, lighting, siren, and communications
- Controller + software for the full alert-to-readiness workflow
- Demonstration of launch, monitor, return, dock, and readiness restore

**Out of scope / later phases (unless agreed otherwise)**

- Final production cosmetics and industrial design polish
- Advanced features beyond the minimum viable POC (to be phased after MVP)
- Uncontrolled sharing of patent claims, credentials, or sensitive architecture outside NDA terms
