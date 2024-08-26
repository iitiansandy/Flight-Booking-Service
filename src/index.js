const express = require('express');

const bodyParser = require('body-parser');

const { ServerConfig, Queue } = require('./config');
const apiRoutes = require('./routes');

const Crons = require('./utils/common/cron-jobs');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text());

app.use('/api', apiRoutes);

// app.use('/bookingService/api', apiRoutes);

app.listen(ServerConfig.PORT, async () => {
    console.log(`Service is running on port ${ServerConfig.PORT}`);
    Crons();
    await Queue.connectQueue();
    console.log("RabbitMQ Connected");
});
