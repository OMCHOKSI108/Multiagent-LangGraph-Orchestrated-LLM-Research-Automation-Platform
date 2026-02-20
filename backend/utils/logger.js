const winston = require('winston');

// Structured JSON format for all transports (production + file)
const structuredFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Human-readable format for console in development
const devConsoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp, service, ...meta }) => {
        const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}]: ${message}${extra}`;
    })
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: structuredFormat,
    defaultMeta: { service: 'research-backend' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error', maxsize: 10_000_000, maxFiles: 3 }),
        new winston.transports.File({ filename: 'logs/combined.log', maxsize: 10_000_000, maxFiles: 5 }),
    ],
});

// Console transport: structured JSON in prod, pretty in dev
if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.Console({ format: structuredFormat }));
} else {
    logger.add(new winston.transports.Console({ format: devConsoleFormat }));
}

module.exports = logger;
