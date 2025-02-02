REST API
```
mkdir ACME-REST && cd ACME-REST
npm init -y
npm install express pg pg-hstore sequelize cors dotenv socket.io
npm install --save-dev nodemon
brew tap timescale/tap
brew install timescale/tap/timescaledb
timescaledb-tune --quiet –yes
timescaledb_move.sh
brew services restart postgresql@17
psql -U admin -d postgres # substitute your superuser in place of admin
CREATE DATABASE acme OWNER demo;
\q
npx sequelize-cli init
# udpate config.json with actual db settings
npx sequelize-cli migration:generate --name create-schema
# created src/
# created src/index.js src/db.js src/routes.js src/websocket.js src/models .env (with db settings corresponding to config/config.js) .gitignore
# filled in migrations/**-create-schema.js
npx sequelize-cli db:migrate


curl http://localhost:4000/api/devices
curl -X POST http://localhost:4000/api/devices -H "Content-Type: application/json" -d '{"name":"Truck 1", "type":"Vehicle"}'
```



simulator
```
mkdir ACME-simulator && cd ACME-simulator
npm init -y
npm install axios commander chalk dotenv
```
