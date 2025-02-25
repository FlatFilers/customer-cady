#!/usr/bin/env bash

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

if [ $# -eq 0 ]
  then
    echo "${RED}✖ Error: No arguments supplied - Please provide an environment name${NC}"
    echo "This script expects to be run with an environment name as an argument. It also expects a .env.{environment} file to be present in the root of the project."
    echo "Example:"
    echo "  file:           .env.staging"
    echo "  dev command:    npm run dev staging"
    echo "  deploy command: npm run deploy staging"
    exit 1
fi

ENV_FILE=".env.$1"

echo "${NC}✂ Checking for environment file at $ENV_FILE${NC}"

if [ -f $ENV_FILE ]; then
  echo "${GREEN}✔ .env found at $ENV_FILE${NC}"
else
  echo "${RED}✖ Error: .env not found at $ENV_FILE${NC}"
  echo "This script expects a .env.{environment} file to be present in the root of the project."
  echo "Example:"
  echo "  file:           .env.staging"
  echo "  dev command:    npm run dev staging"
  echo "  deploy command: npm run deploy staging"

  exit 1
fi

export $(cat ${ENV_FILE} | xargs) && npx flatfile develop ./src/flatfile/index.ts
