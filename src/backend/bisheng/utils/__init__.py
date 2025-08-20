import hashlib
import uuid
import json
import loguru


def generate_uuid() -> str:
    """
    生成uuid的字符串
    """
    return uuid.uuid4().hex


def md5_hash(original_string: str):
    md5 = hashlib.md5()
    md5.update(original_string.encode('utf-8'))
    return md5.hexdigest()


def json2dict(json_str) -> dict:
    if not json_str:
        return {}

    if isinstance(json_str, dict):
        return json_str

    try:
        result = json.loads(json_str)
        if not result:
            result = {}
        return result
    except Exception as e:
        loguru.logger.debug(f'json2dict json_str={json_str} error={e}')
        return {}
