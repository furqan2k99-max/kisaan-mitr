FROM jenkins/jenkins:lts

USER root

# Install Docker CLI and Docker Compose v2
RUN apt-get update -qq && \
    apt-get install -y -qq docker.io curl && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /usr/local/lib/docker/cli-plugins && \
    curl -SL "https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose && \
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Allow jenkins user to run docker commands
RUN usermod -aG docker jenkins

USER jenkins
