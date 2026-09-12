#!/bin/sh
# Fetch Jenkins CSRF crumb and create pipeline job
CRUMB=$(curl -s -u 'admin:db09944d2e514d67b0ddcfc489d3afea' \
  'http://localhost:8080/crumbIssuer/api/json' | \
  tr ',' '\n' | grep crumb | cut -d'"' -f4)
echo "Crumb: ${CRUMB}"
HTTP_CODE=$(curl -s -w '%{http_code}' -o /tmp/create-result.txt \
  -X POST -u 'admin:db09944d2e514d67b0ddcfc489d3afea' \
  -H "Jenkins-Crumb:${CRUMB}" \
  -H 'Content-Type: application/xml' \
  --data-binary @/tmp/job-config.xml \
  'http://localhost:8080/createItem?name=kisaan-mitr')
echo "HTTP Status: ${HTTP_CODE}"
cat /tmp/create-result.txt
