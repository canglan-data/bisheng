import smtplib
import traceback
import logging
from typing import List, Union
from email.mime.image import MIMEImage
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.utils import formataddr


class EmailClient:
    """支持发送文本、附件和内嵌图片的邮件工具类"""

    def __init__(self, mail: str, password: str, msg_from: str,
                 server_host: str = 'smtp.feishu.cn', server_port: int = 465,
                 use_ssl: bool = True, debug: bool = False):
        self.sender_mail = mail
        self.sender_pass = password
        self.msg_from = formataddr((msg_from, mail))
        self.server_host = server_host
        self.server_port = server_port
        self.use_ssl = use_ssl
        self.debug = debug

        self.title = "无标题"
        self.receiver: List[str] = []
        self.cc: List[str] = []
        self.bcc: List[str] = []

        self.file_list: List[str] = []
        self.images: List[str] = []
        self.content = ""
        self.msg_root = MIMEMultipart('related')

        self._logger = logging.getLogger(__name__)

    @staticmethod
    def _normalize_recipients(recipients: Union[str, List[str]]) -> List[str]:
        return [recipients] if isinstance(recipients, str) else recipients or []

    def set_title(self, title: str) -> None:
        self.title = title

    def set_content(self, content: str, subtype: str = 'plain') -> None:
        self.content = content
        self.msg_root = MIMEMultipart('related')
        self.msg_root.attach(MIMEText(content, subtype, 'utf-8'))

    def add_content(self, content: str, subtype: str = 'plain') -> None:
        self.content += content
        self.msg_root.attach(MIMEText(content, subtype, 'utf-8'))

    def set_receiver(self, receiver: Union[str, List[str]]) -> None:
        self.receiver = self._normalize_recipients(receiver)

    def set_cc(self, cc: Union[str, List[str]]) -> None:
        self.cc = self._normalize_recipients(cc)

    def set_bcc(self, bcc: Union[str, List[str]]) -> None:
        self.bcc = self._normalize_recipients(bcc)

    def add_send_file(self, file_path: str) -> None:
        self.file_list.append(file_path)

    def add_image(self, image_path: str) -> None:
        self.images.append(image_path)

    def set_server(self, host: str, port: int, use_ssl: bool = True) -> None:
        self.server_host = host
        self.server_port = port
        self.use_ssl = use_ssl

    def _attach_images(self, msg: MIMEMultipart) -> None:
        for image_path in self.images:
            try:
                with open(image_path, 'rb') as f:
                    image_data = f.read()
                image_name = image_path.split('/')[-1]
                msg_image = MIMEImage(image_data)
                msg_image.add_header('Content-ID', f'<{image_name}>')
                msg_image.add_header('Content-Disposition', 'inline', filename=image_name)
                msg.attach(msg_image)
            except Exception as e:
                self._logger.warning(f"[图片添加失败] {image_path}: {e}")

    def _attach_files(self, msg: MIMEMultipart) -> None:
        for file_path in self.file_list:
            try:
                with open(file_path, 'rb') as f:
                    file_data = f.read()
                filename = file_path.split('/')[-1]
                attachment = MIMEApplication(file_data, _subtype='octet-stream')
                attachment.add_header('Content-Disposition', 'attachment', filename=filename)
                msg.attach(attachment)
            except Exception as e:
                self._logger.warning(f"[附件添加失败] {file_path}: {e}")

    def _construct_message(self) -> MIMEMultipart:
        msg = MIMEMultipart('mixed')
        msg['From'] = self.msg_from
        msg['To'] = ', '.join(self.receiver)
        if self.cc:
            msg['Cc'] = ', '.join(self.cc)
        msg['Subject'] = self.title

        msg.attach(self.msg_root)
        self._attach_images(msg)
        self._attach_files(msg)

        return msg

    def send_mail(self) -> bool:
        try:
            msg = self._construct_message()
            server = smtplib.SMTP_SSL(self.server_host, self.server_port) if self.use_ssl else smtplib.SMTP(
                self.server_host, self.server_port)
            if not self.use_ssl:
                server.starttls()

            if self.debug:
                server.set_debuglevel(1)

            server.login(self.sender_mail, self.sender_pass)
            all_recipients = self.receiver + self.cc + self.bcc
            server.sendmail(self.sender_mail, all_recipients, msg.as_string())
            server.quit()

            self._logger.info(f"[邮件发送成功] 标题='{self.title}', 收件人={self.receiver}")
            return True

        except Exception as e:
            self._logger.error(f"[邮件发送失败] 标题='{self.title}', 错误: {e}")
            if self.debug:
                traceback.print_exc()
            return False
        finally:
            self.msg_root = MIMEMultipart('related')

# if __name__ == '__main__':
#     mailer = EmailClient(mail="xxx@domain.com", password="yourpass", msg_from="通知服务")
#     mailer.set_receiver(["user@example.com"])
#     mailer.set_title("今日数据日报")
#     mailer.set_content("<h1>你好，数据见附件</h1>", subtype="html")
#     mailer.add_send_file("report.xlsx")
#     mailer.send_mail()
