
# Envision - Backend Microservices

Backend for the Envision platform, designed using a **microservices architecture** with **Node.js**, **Express**, and **TypeScript**. Each service is containerized and communicates via **Kafka**.

## 🧩 Services Overview

- **API Gateway** - Request routing and service discovery
- **User Service** - Auth, roles, and profile management
- **Idea Service** - Idea lifecycle management
- **Engagement Service** - Likes and comments
- **Notification Service** - Real-time notifications
- **File Service** - Secure file upload (S3)

 ![image](https://github.com/user-attachments/assets/da29c303-e5eb-43ff-9856-54e6c46002bf)
- 

## 💻 Tech Stack

<img height="150" src="https://github.com/user-attachments/assets/e9a7aadc-d58a-4253-aa70-7d520df99672"/>
<img height="150" src="https://github.com/user-attachments/assets/88388493-feae-4863-96a7-d8283d9c1186"/>


<img height="150" src="https://github.com/user-attachments/assets/0d15c4e7-df22-42e7-ab89-9e0164215f78"/>

<img height="150" src="https://github.com/user-attachments/assets/9ee2d22d-e5c3-4fb7-8e9d-701bf152182d"/>


- **Node.js** + **Express** + **TypeScript**
- **Drizzle ORM** + **PostgreSQL**
- **Kafka** + **Redis**
- **Amazon S3** for file storage
- **Docker** for containerization
- **JWT** for authentication

## 🗂️ Localhost URLs

| Service             | URL                       |
|---------------------|---------------------------|
| API Gateway         | http://localhost:8080     |
| User Service        | http://localhost:8081     |
| Idea Service        | http://localhost:8082     |
| Notification REST   | http://localhost:8083     |
| Notification Socket | ws://localhost:7003       |
| File Service        | http://localhost:8084     |
| Engagement Service  | http://localhost:8085     |
| Kafka               | http://localhost:9092     |
| Redis               | redis://localhost:6379    |

## ⚙️ Development Setup

### Prerequisites

- Docker + Docker Compose
- Node.js >= 18

### Run Services Locally

```bash
docker-compose up
