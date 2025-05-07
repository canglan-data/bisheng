import logging
import logging.handlers
import socket
import time
from bisheng.settings import settings, SYSLogConf


class SyslogClient:
    def __init__(self, config: SYSLogConf):
        self.host = config.host
        self.port = config.port
        self.prefix = config.name
        self.log_format = config.log_format
        self.date_format = config.date_format

        self.logger = self._setup_logger()

    def _setup_logger(self):
        logger = logging.getLogger(self.prefix)
        logger.setLevel(logging.DEBUG)

        handler = logging.handlers.SysLogHandler(
            address=(self.host, self.port),
            socktype=socket.SOCK_DGRAM
        )

        formatter = logging.Formatter(self.log_format, datefmt=self.date_format)
        handler.setFormatter(formatter)

        if not logger.hasHandlers():
            logger.addHandler(handler)

        return logger

    def debug(self, message):
        self.logger.debug(message)

    def info(self, message):
        self.logger.info(message)

    def warning(self, message):
        self.logger.warning(message)

    def error(self, message):
        self.logger.error(message)

    def critical(self, message):
        self.logger.critical(message)

    def log(self, level, message):
        level = level.lower()
        if level == "debug":
            self.debug(message)
        elif level == "info":
            self.info(message)
        elif level == "warning":
            self.warning(message)
        elif level == "error":
            self.error(message)
        elif level == "critical":
            self.critical(message)
        else:
            self.info(f"[未知级别]{message}")


syslog_client = SyslogClient(settings.syslog_conf)
