# Docker Deployment Guide

This guide explains how to deploy the SeenUnseen Bookshelf on your local network using Docker.

## Prerequisites

- Docker installed on your machine
- Docker Compose installed (usually comes with Docker Desktop)
- **Important**: Create the data directory and generate `public/data/books.json` first (see "Prepare Your Data" below)

## Quick Start

1. **Prepare your data** (required before Docker build):
   ```bash
   # Create necessary directories
   npm run create-dirs
   
   # Process CSV files and generate books.json
   npm run process-data
   
   # Optional: fetch book covers (takes 15-20 minutes for 1400+ books)
   npm run fetch-covers
   ```
   
   **Note**: The `public/data` and `public/images` directories must exist on your host machine before running Docker. If they don't exist, Docker will create empty directories, but the app won't work without `books.json`.

2. **Build and start the container**:
   ```bash
   docker-compose up -d
   ```

3. **Access the application**:
   - On the same machine: http://localhost:3000
   - From other devices on your network: http://YOUR_IP_ADDRESS:3000
     - Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

## Commands

### Start the service
```bash
docker-compose up -d
```

### Stop the service
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f
```

### Rebuild after code changes
```bash
docker-compose up -d --build
```

### Check status
```bash
docker-compose ps
```

## Configuration

### Change Port

Edit `docker-compose.yml` to change the port:
```yaml
ports:
  - "8080:3000"  # Change 8080 to your desired port
```

### Update Data

To update books data:
1. Stop the container: `docker-compose down`
2. Update `public/data/books.json` or run scripts
3. Start again: `docker-compose up -d`

### Persistent Data

The `docker-compose.yml` mounts:
- `./public/data` - Book data (read-only)
- `./public/images` - Book covers (read-only)

These directories persist on your host machine, so updates to data don't require rebuilding the image.

## Network Access

To access from other devices on your local network:

1. **Find your machine's IP address**:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`
   - Usually something like `192.168.1.100` or `10.0.0.5`

2. **Ensure port 3000 is accessible**:
   - Check firewall settings
   - Make sure Docker is allowing connections

3. **Access from other devices**:
   - Open browser on another device
   - Navigate to: `http://YOUR_IP_ADDRESS:3000`

## Troubleshooting

### Container won't start
- Check logs: `docker-compose logs`
- Ensure port 3000 isn't already in use
- Verify `public/data/books.json` exists

### Can't access from network
- Check firewall settings
- Verify Docker network configuration
- Try accessing from the host machine first (localhost:3000)

### Data not showing
- Ensure `public/data/books.json` exists and is valid JSON
- Check volume mounts in `docker-compose.yml`
- Verify file permissions

### Rebuild everything
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Production Considerations

For production deployment, consider:

1. **Environment variables**: Add `.env` file for configuration
2. **Reverse proxy**: Use nginx or Traefik in front
3. **HTTPS**: Set up SSL certificates
4. **Monitoring**: Add health checks and logging
5. **Backup**: Regular backups of `public/data/books.json`

## Example with nginx (optional)

If you want to add nginx as a reverse proxy:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - bookshelf
```

