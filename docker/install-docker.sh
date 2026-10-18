#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo: sudo $0"
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This installer supports Debian and Ubuntu hosts using apt."
  echo "Install Docker Engine and the Compose plugin for your distribution, then rerun this script to configure IPv6."
  exit 2
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl python3
install -m 0755 -d /etc/apt/keyrings
curl -fsSL "https://download.docker.com/linux/$(. /etc/os-release && echo "$ID")/gpg" -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

. /etc/os-release
cat >/etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/$ID
Suites: $VERSION_CODENAME
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

mkdir -p /etc/docker
if [[ -f /etc/docker/daemon.json ]]; then
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY'
import json
from pathlib import Path
p = Path('/etc/docker/daemon.json')
data = json.loads(p.read_text())
    # Compose networks use their own explicit IPv6 subnets. The daemon-wide
    # IPv6 pool enables IPv6 on Docker's default bridge as well.
    data['ipv6'] = True
    data['fixed-cidr-v6'] = data.get('fixed-cidr-v6', 'fd00:dead:beef::/48')
p.write_text(json.dumps(data, indent=2) + '\n')
PY
  else
    echo "Existing /etc/docker/daemon.json found; install python3 to merge IPv6 settings safely."
    exit 3
  fi
else
  cat >/etc/docker/daemon.json <<'EOF'
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00:dead:beef::/48",
  "experimental": true
}
EOF
fi

systemctl enable --now docker
systemctl restart docker
echo "Docker Engine and Compose installed. Docker IPv6 is enabled."
echo "The development app publishes TCP 3000 on IPv4 and IPv6; device access also depends on host addresses, firewall, and network routing."
echo "Add your login user to the docker group if desired, then log out and back in: sudo usermod -aG docker USERNAME"
