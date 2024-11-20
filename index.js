const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mqtt = require('mqtt');
require('dotenv').config();


// Set up the S3 client
const s3 = new S3Client({
    region: 'us-east-1', // Set your region
});

const TOPICS = [
    '/carparks/815768fd-aa5c-4ca2-8315-88c98662046a/events/entries/#',
    '/carparks/815768fd-aa5c-4ca2-8315-88c98662046a/events/exits/#',
    '/carparks/815768fd-aa5c-4ca2-8315-88c98662046a/events/paymenttransactions/#',
    '/carparks/815768fd-aa5c-4ca2-8315-88c98662046a/events/door-transitions/#'
]

const getFormattedDatePath = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
};

// MQTT Client Setup
const client = mqtt.connect(process.env.MQTT_BROKER_URL, {
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASSWORD,
    protocol: 'mqtts',
    port: 8883,
    rejectUnauthorized: false // Change to true if using valid certificates
});

// Simulate Lambda Function
const handler = async () => {
    return new Promise((resolve, reject) => {
        try {
            client.on('connect', () => {
                try {
                    console.log('Connected to MQTT broker');
                    client.subscribe(TOPICS, (err) => {
                        if (err) {
                            console.error('Error subscribing to topics:', err);
                            return reject({ status: 'failed', message: 'Subscription error', error: err });
                        }
                        console.log('Subscribed to topics:', TOPICS);
                    });
                } catch (err) {
                    console.error('Error during MQTT connection handling:', err);
                    reject({ code: 0, status: 'failed', message: 'MQTT connection error', error: err });
                }
            });

            // Listen for messages and handle S3 uploads
            client.on('message', async (topic, message) => {
                try {
                    const msg = message.toString();
                    console.log(`Received message: ${msg} on topic: ${topic}`);

                    // Determine folder based on topic
                    let folder = 'other_logs';
                    if (topic.includes('entries')) folder = 'entry_logs';
                    else if (topic.includes('exits')) folder = 'exit_logs';
                    else if (topic.includes('paymenttransactions')) folder = 'payment_logs';
                    else if (topic.includes('door-transitions')) folder = 'door_logs';

                    folder += `/${getFormattedDatePath()}`;

                    // Prepare parameters for S3 upload
                    const params = {
                        Bucket: process.env.S3_BUCKET,
                        Key: `dev/ingest/sv1/mqtt/${folder}/${Date.now()}.json`,
                        Body: JSON.stringify({ topic, msg }),
                        ContentType: 'application/json'
                    };

                    try {
                        const command = new PutObjectCommand(params);
                        await s3.send(command);
                        resolve({ code: 1, status: 'success', message: 'Execution completed successfully' });
                    } catch (err) {
                        if (err.Code === 'AccessDenied') {
                            reject({ code: 0, status: 'failed', message: 'Handler error', error: 'S3 Access Denied: Ensure the bucket policy allows write access.' });
                        } else if (err.Code === 'NoSuchBucket') {
                            reject({ code: 0, status: 'failed', message: 'Handler error', error: `S3 Bucket Not Found: The bucket "${S3_BUCKET}" does not exist.` });
                        } else {
                            reject({ code: 0, status: 'failed', message: 'Handler error', error: err });
                        }
                        reject({ code: 0, status: 'failed', message: 'Handler error', error: err.message });
                    }
                } catch (err) {
                    console.error('Error handling MQTT message:', err);
                    return reject({ code: 0, status: 'failed', message: 'MQTT message handling error', error: err });
                }
            });

            // Handle MQTT client errors
            client.on('error', (err) => {
                console.error('MQTT Client Error:', err);
                reject({ code: 0, status: 'failed', message: 'MQTT client error', error: err });
            });

            // Simulate test message (Optional)
            try {
                const testMessage = JSON.stringify({ example: "test message" });
                console.log("process.env.TOPICS[1]", process.env.TOPICS);
                client.emit("message", TOPICS[1], Buffer.from(testMessage));
            } catch (err) {
                console.error('Error emitting test message:', err);
                reject({ code: 0, status: 'failed', message: 'Test message error', error: err });
            }


        } catch (err) {
            console.error('Handler error:', err);
            reject({ code: 0, status: 'failed', message: 'Handler error', error: err });
        }
    });
};

// Execute the local function
handler()
    .then((result) => {
        console.log('Function executed successfully:', result);
    })
    .catch((err) => {
        console.error('Error running Lambda function locally:', err);
    });
