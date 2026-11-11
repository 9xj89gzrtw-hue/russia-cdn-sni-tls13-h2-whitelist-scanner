# Apify Actor image. The base image already has Node 20, `apify` CLI helpers
# and the right user (myuser) for the platform.
FROM apify/actor-node:20

# Dependencies first: layer cache survives source edits.
COPY package*.json ./
RUN npm --quiet set progress=false \
 && npm install --omit=dev --omit=optional \
 && echo "Node: $(node -v)" && echo "NPM: $(npm -v)"

# Then the code: Actor entry point, scanner core, demo catalogue.
COPY . ./

# Apify runs `npm start` -> `node src/main.js`.
CMD ["npm", "start", "--silent"]
