import logging
import logging.handlers
import socket
import time

class SyslogClient:
    def __init__(self, config: dict):
        """
        初始化 Syslog 客户端
        config 参数示例:
        {
            'host': '127.0.0.1',
            'port': 514,
            'prefix': 'my-app',
            'interval': 5,
            'log_format': '%(asctime)s %(levelname)s %(name)s: %(message)s',
            'date_format': '%Y-%m-%d %H:%M:%S'
        }
        """
        self.host = config.get('host', '127.0.0.1')
        self.port = config.get('port', 514)
        self.prefix = config.get('prefix', 'python-client')
        self.interval = config.get('interval', 5)
        self.log_format = config.get('log_format', '%(asctime)s %(name)s: %(message)s')
        self.date_format = config.get('date_format', '%b %d %H:%M:%S')

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

    def debug(self, message): self.logger.debug(message)
    def info(self, message): self.logger.info(message)
    def warning(self, message): self.logger.warning(message)
    def error(self, message): self.logger.error(message)
    def critical(self, message): self.logger.critical(message)

    def start_logging(self, message="hello world", level="info"):
        try:
            while True:
                self.log(level, message)
                time.sleep(self.interval)
        except KeyboardInterrupt:
            print("日志发送已中止。")

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

if __name__ == "__main__":
    config = {
        'host': '127.0.0.1',
        'port': 514,
        'prefix': 'bisheng-backend',
        'interval': 5,
        'log_format': '%(asctime)s %(levelname)s %(name)s: %(message)s',
        'date_format': '%b %d %H:%M:%S'  # 确保冒号后无空格
    }

    client = SyslogClient(config)
    client.start_logging("hello world", level="info")