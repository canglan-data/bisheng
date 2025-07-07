from __future__ import annotations

import copy
import logging
import re

from langchain.docstore.document import Document
from langchain_text_splitters import MarkdownHeaderTextSplitter
from bisheng_langchain.text_splitter import ElemCharacterTextSplitter
from collections import defaultdict

from typing import (Any, Iterable, List, Optional)

logger = logging.getLogger(__name__)


def get_chunk_chapter_list(metadata: dict):
    result = []
    for i in list(range(1, 6)):
        key = f"Header {i}"
        if key in metadata:
            value = metadata.get(key, '')
            value = str(value).strip()
            result.append(f"{('#' * i)} {value}")

    return result


def can_use_header_text_split(docs: list[Document]) -> bool:
    # return True
    """
    判断文档是否能按层级切分，主要统计是否有标准的标题结构
    """
    if not docs:
        return False

    for doc in docs:
        count = count_headers(doc.page_content)

        if count:
            # 有两个以上层级，可切分
            if len(count) >= 2:
                return True

            for value in count.values():
                # 同一层级的标题有2个以上，可切分
                if value >= 2:
                    return True

    return False


def count_headers(md_text: str):
    """
    使用正则表达式统计 Markdown 文本中 H1 到 H6 标题的真实数量。
    """
    # re.MULTILINE 确保 '^' 匹配每一行的开始
    matches = re.findall(r'^(#{1,6})\s', md_text, re.MULTILINE)

    counts = defaultdict(int)
    for match in matches:
        counts[match] += 1

    return counts


def make_split_on(counts, max_level: int = 3):
    """
    根据统计的标题真实情况，决定切分的规则（如：缺少二级标题时，三级标题是相对的二级标题）
    """

    sort_items = sorted(counts.items())
    split_list = []
    for item in sort_items:
        split_list.append(
            (item[0], f"Header {len(item[0])}")
        )

    return split_list[:max_level]


class HeaderTextSplitter(ElemCharacterTextSplitter):
    def __init__(
            self,
            separators: Optional[List[str]] = None,
            separator_rule: Optional[List[str]] = None,
            is_separator_regex: bool = False,
            keep_separator: bool = True,
            chunk_size: int = 1000,  # 单个chunk内容长度
            chunk_overlap: int = 0,
            split_max_level: int = 3,
            enable_chunk_chapter: int = 0,
            **kwargs: Any,
    ) -> None:
        """Create a new TextSplitter."""
        super().__init__(
            separators=separators,
            separator_rule=separator_rule,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            is_separator_regex=is_separator_regex,
            keep_separator=keep_separator,
            **kwargs
        )

        if not (1 <= split_max_level <= 5):
            split_max_level = 3

        self._split_max_level = split_max_level
        self._enable_chunk_chapter = enable_chunk_chapter

    def split_chunk_text(self, docs: list[Document]) -> list[Document]:
        """
        切分单个doc内容，避免过长
        """
        result = []
        for doc in docs:
            split_list = self.split_text(doc.page_content)
            if len(split_list) > 1:
                for text in split_list:
                    new_doc = copy.deepcopy(doc)
                    new_doc.page_content = text
                    result.append(new_doc)
            else:
                result.append(doc)

        return result

    def split_documents(self, documents: Iterable[Document]) -> List[Document]:
        result = []
        for doc in documents:
            header_counts = count_headers(doc.page_content)
            split_on = make_split_on(header_counts, max_level=self._split_max_level)

            markdown_splitter = MarkdownHeaderTextSplitter(
                headers_to_split_on=split_on,
                strip_headers=True
            )

            # 执行层级切分
            chunk_list = markdown_splitter.split_text(doc.page_content)

            # 执行单个chunk切分
            chunk_list_new = self.split_chunk_text(docs=chunk_list)

            for chunk_doc in chunk_list_new:
                new_metadata = copy.deepcopy(doc.metadata)
                new_metadata.update(chunk_doc.metadata)

                if self._enable_chunk_chapter:
                    chunk_chapter_list = get_chunk_chapter_list(new_metadata)
                    new_metadata['chunk_chapter_list'] = chunk_chapter_list

                chunk_doc.metadata = new_metadata

            result.extend(chunk_list_new)

        return result