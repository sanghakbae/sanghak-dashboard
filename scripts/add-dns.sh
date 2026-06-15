#!/usr/bin/env bash
# www.sanghak.kr + sanghak.kr(apex) -> GitHub Pages CNAME 추가 (DNS only)
# 사용법: CF_DNS_TOKEN=xxx bash scripts/add-dns.sh
set -euo pipefail

: "${CF_DNS_TOKEN:?CF_DNS_TOKEN 환경변수가 필요합니다 (Zone:DNS:Edit 권한)}"
ZONE="d67041c32a70797ba596d9cee1bcdba2"   # sanghak.kr
TARGET="sanghakbae.github.io"
API="https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records"

create_or_update() {
  local name="$1"
  # 같은 이름의 기존 CNAME 있으면 갱신, 없으면 생성
  local existing
  existing=$(curl -s "$API?type=CNAME&name=$name" -H "Authorization: Bearer $CF_DNS_TOKEN" \
    | python3 -c "import sys,json;r=json.load(sys.stdin).get('result',[]);print(r[0]['id'] if r else '')")
  local body
  body=$(printf '{"type":"CNAME","name":"%s","content":"%s","proxied":false,"ttl":1}' "$name" "$TARGET")
  if [ -n "$existing" ]; then
    curl -s -X PUT "$API/$existing" -H "Authorization: Bearer $CF_DNS_TOKEN" \
      -H "Content-Type: application/json" --data "$body" \
      | python3 -c "import sys,json;d=json.load(sys.stdin);print('  updated',d['result']['name'] if d.get('success') else d.get('errors'))"
  else
    curl -s -X POST "$API" -H "Authorization: Bearer $CF_DNS_TOKEN" \
      -H "Content-Type: application/json" --data "$body" \
      | python3 -c "import sys,json;d=json.load(sys.stdin);print('  created',d['result']['name'] if d.get('success') else d.get('errors'))"
  fi
}

echo "Adding DNS records to sanghak.kr ..."
create_or_update "www.sanghak.kr"
create_or_update "sanghak.kr"
echo "Done."
