#!/bin/bash
# Run from YOUR LOCAL MACHINE to push files to the Oracle VM and start the worker.
# Usage: bash oracle_deploy.sh YOUR_VM_IP
# Example: bash oracle_deploy.sh 129.153.42.10

VM_IP=$1
VM_USER="ubuntu"
REMOTE="$VM_USER@$VM_IP"
APPT_DIR="C:/Users/Mouth/bsc-appointment-workflow"

if [ -z "$VM_IP" ]; then
  echo "Usage: bash oracle_deploy.sh YOUR_VM_IP"
  exit 1
fi

echo "=== Deploying to $REMOTE ==="

# Copy appointment scripts
echo "Copying appointment scripts..."
scp "$APPT_DIR/scripts/bsc_matchup.js"              "$REMOTE:~/team-rise/scripts/"
scp "$APPT_DIR/scripts/bsc_personal_appointment.js" "$REMOTE:~/team-rise/scripts/"
scp "$APPT_DIR/scripts/bsc_followup.js"             "$REMOTE:~/team-rise/scripts/"
scp "$APPT_DIR/package.json"                        "$REMOTE:~/team-rise/"
scp "$APPT_DIR/package-lock.json"                   "$REMOTE:~/team-rise/"

# Copy worker and env
echo "Copying worker + credentials..."
scp "appointment_worker.mjs"                        "$REMOTE:~/team-rise/"
scp "$APPT_DIR/.env"                                "$REMOTE:~/team-rise/.env.appt"

# Append Supabase keys to .env on the VM
SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d= -f2)
SUPABASE_KEY=$(grep VITE_SUPABASE_ANON_KEY .env | cut -d= -f2)
ssh "$REMOTE" "cat ~/team-rise/.env.appt > ~/team-rise/.env && \
  echo 'VITE_SUPABASE_URL=$SUPABASE_URL' >> ~/team-rise/.env && \
  echo 'VITE_SUPABASE_ANON_KEY=$SUPABASE_KEY' >> ~/team-rise/.env && \
  rm ~/team-rise/.env.appt"

# Install deps + Playwright browser
echo "Installing npm packages + Playwright Chromium..."
ssh "$REMOTE" "cd ~/team-rise && npm install && npx playwright install chromium"

# Start/restart worker with PM2
echo "Starting worker with PM2..."
ssh "$REMOTE" "cd ~/team-rise && pm2 delete appt-worker 2>/dev/null || true && \
  pm2 start appointment_worker.mjs --name appt-worker && \
  pm2 save && \
  pm2 startup | tail -1 | bash || true"

echo ""
echo "=== Deploy complete ==="
echo "Worker is running on $VM_IP"
echo "Check logs: ssh $REMOTE 'pm2 logs appt-worker --lines 20'"
