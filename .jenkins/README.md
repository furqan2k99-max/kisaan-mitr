# Jenkins CI/CD Setup for Kisaan Mitr

## Access Jenkins

1. Open your browser and navigate to: **http://localhost:8080**
2. On first launch, Jenkins will ask for the initial admin password.
3. To get the password, run:
   ```bash
   docker exec kisaan-mitr-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
   ```
4. Install suggested plugins and create your admin user.
5. Click "Start using Jenkins"

## Create Pipeline Job

1. Click **New Item** on the left sidebar
2. Enter a name (e.g., `kisaan-mitr-deploy`)
3. Select **Pipeline** and click OK
4. In the pipeline configuration:
   - Under "Pipeline", select **Pipeline script from SCM**
   - Choose **Git** as the SCM
   - Enter your repository URL
   - Specify the branch to build (e.g., `main`)
   - In "Script Path", keep as `Jenkinsfile`
5. Click **Save**

## Connect to GitHub

1. **Install GitHub Plugin:**
   - Go to **Manage Jenkins** → **Manage Plugins**
   - Go to "Available" tab and search for "GitHub Integration Plugin"
   - Install it and restart Jenkins

2. **Add GitHub Credentials:**
   - Go to **Manage Jenkins** → **Credentials**
   - Add a new "Username with password" credential
   - Enter your GitHub username and Personal Access Token (PAT)

3. **Configure Webhook (Optional):**
   - Go to your GitHub repository → Settings → Webhooks
   - Add webhook: `http://localhost:8080/github-webhook/`
   - This triggers builds automatically on push events

4. **Build Trigger:**
   - In your pipeline job configuration, check "GitHub hook trigger for GITScm polling"
   - Now every push to the repository will trigger a new build

## Troubleshooting

- If Docker commands fail in Jenkins, ensure the Docker socket is mounted correctly
- Check Jenkins logs: `docker logs kisaan-mitr-jenkins`
- Ensure port 8080 is not in use by another application