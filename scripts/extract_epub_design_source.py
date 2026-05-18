from __future__ import annotations

import argparse
import html
import json
import re
import unicodedata
import zipfile
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET


BLOCK_TAGS = {
    'p', 'blockquote', 'figcaption', 'caption', 'td', 'th'
}
HEADING_TAGS = {'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}
SKIP_TAGS = {'script', 'style', 'svg', 'metadata', 'head', 'title'}


def local_name(tag: str) -> str:
    return tag.rsplit('}', 1)[-1].lower() if '}' in tag else tag.lower()


def normalize_text(value: str) -> str:
    value = html.unescape(value)
    value = value.replace('\xa0', ' ')
    value = unicodedata.normalize('NFKC', value)
    value = re.sub(r'[ \t\r\f\v]+', ' ', value)
    value = re.sub(r' ?\n ?', '\n', value)
    return value.strip()


def collect_inline_text(node: ET.Element) -> str:
    parts: list[str] = []

    def walk(element: ET.Element) -> None:
        tag = local_name(element.tag)
        if tag in SKIP_TAGS:
            return
        if element.text:
            parts.append(element.text)
        for child in list(element):
            child_tag = local_name(child.tag)
            if child_tag == 'br':
                parts.append('\n')
            else:
                walk(child)
            if child.tail:
                parts.append(child.tail)

    walk(node)
    text = ''.join(parts)
    text = normalize_text(text)
    text = re.sub(r'\n{2,}', '\n', text)
    return text


def extract_blocks(body: ET.Element) -> list[str]:
    blocks: list[str] = []

    def walk(element: ET.Element) -> None:
        tag = local_name(element.tag)
        if tag in SKIP_TAGS:
            return
        if tag in HEADING_TAGS:
            text = collect_inline_text(element)
            if text:
                level = min(max(int(tag[1]), 1), 6)
                blocks.append(f"{'#' * level} {text}")
            return
        if tag == 'li':
            text = collect_inline_text(element)
            if text:
                blocks.append(f'- {text}')
            return
        if tag in BLOCK_TAGS:
            text = collect_inline_text(element)
            if text:
                blocks.append(text)
            return
        for child in list(element):
            walk(child)

    walk(body)

    cleaned: list[str] = []
    seen_blank = False
    for block in blocks:
        block = normalize_text(block)
        if not block:
            if not seen_blank:
                cleaned.append('')
            seen_blank = True
            continue
        cleaned.append(block)
        seen_blank = False
    return cleaned


def slugify(value: str) -> str:
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii')
    value = re.sub(r'[^a-zA-Z0-9]+', '-', value).strip('-').lower()
    value = value[:80].rstrip('-')
    return value or 'chapter'


def chapter_title(blocks: Iterable[str], fallback: str) -> str:
    for block in blocks:
        if not block:
            continue
        if block.startswith('#'):
            return block.lstrip('# ').strip()
        return block.strip()
    return fallback


def relative_join(base: Path, href: str) -> str:
    return str((base / href).as_posix())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Extract an EPUB into markdown and plain text corpora.')
    parser.add_argument('--input', required=True, help='Path to the EPUB file.')
    parser.add_argument('--output', required=True, help='Directory for extracted outputs.')
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    epub_path = Path(args.input)
    output_dir = Path(args.output)
    chapters_dir = output_dir / 'chapters'
    output_dir.mkdir(parents=True, exist_ok=True)
    chapters_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(epub_path) as archive:
        container = ET.fromstring(archive.read('META-INF/container.xml'))
        rootfile = container.find('{urn:oasis:names:tc:opendocument:xmlns:container}rootfiles/{urn:oasis:names:tc:opendocument:xmlns:container}rootfile')
        if rootfile is None:
            raise RuntimeError('Could not locate EPUB rootfile.')
        opf_path = rootfile.attrib['full-path']
        opf_dir = Path(opf_path).parent
        opf = ET.fromstring(archive.read(opf_path))
        ns = {'opf': 'http://www.idpf.org/2007/opf', 'dc': 'http://purl.org/dc/elements/1.1/'}
        metadata = {
            'title': (opf.findtext('opf:metadata/dc:title', namespaces=ns) or '').strip(),
            'creator': (opf.findtext('opf:metadata/dc:creator', namespaces=ns) or '').strip(),
            'publisher': (opf.findtext('opf:metadata/dc:publisher', namespaces=ns) or '').strip(),
            'language': (opf.findtext('opf:metadata/dc:language', namespaces=ns) or '').strip(),
            'identifier': (opf.findtext('opf:metadata/dc:identifier', namespaces=ns) or '').strip(),
        }
        manifest = {
            item.attrib['id']: {
                'href': item.attrib.get('href', ''),
                'media_type': item.attrib.get('media-type', ''),
            }
            for item in opf.findall('opf:manifest/opf:item', ns)
        }
        spine = [item.attrib['idref'] for item in opf.findall('opf:spine/opf:itemref', ns)]

        manifest_entries: list[dict[str, object]] = []
        book_md_parts: list[str] = []
        book_txt_parts: list[str] = []

        for index, idref in enumerate(spine, start=1):
            item = manifest.get(idref)
            if not item:
                continue
            href = item['href']
            media_type = item['media_type']
            if media_type not in {'application/xhtml+xml', 'text/html'}:
                continue
            archive_member = relative_join(opf_dir, href)
            root = ET.fromstring(archive.read(archive_member))
            body = None
            for element in root.iter():
                if local_name(element.tag) == 'body':
                    body = element
                    break
            if body is None:
                continue
            blocks = extract_blocks(body)
            fallback_title = Path(href).stem.replace('_', ' ')
            title = chapter_title(blocks, fallback_title)
            slug = slugify(title)
            filename = f'{index:03d}-{slug}.md'
            file_path = chapters_dir / filename
            md_content = '\n\n'.join(blocks).strip() + '\n'
            txt_content = '\n\n'.join(block.lstrip('# ').strip() for block in blocks if block).strip() + '\n'
            file_path.write_text(md_content, encoding='utf-8')
            manifest_entries.append({
                'sequence': index,
                'idref': idref,
                'source_href': archive_member,
                'title': title,
                'output_markdown': str(file_path.relative_to(output_dir).as_posix()),
            })
            book_md_parts.append(f'<!-- source: {archive_member} -->\n\n{md_content.strip()}')
            book_txt_parts.append(f'{title}\n\n{txt_content.strip()}')

    full_book_md = '# ' + metadata['title'] + '\n\n' + '\n\n---\n\n'.join(book_md_parts).strip() + '\n'
    full_book_txt = metadata['title'] + '\n\n' + '\n\n' + ('\n\n' + ('=' * 80) + '\n\n').join(book_txt_parts).strip() + '\n'

    (output_dir / 'full-book.md').write_text(full_book_md, encoding='utf-8')
    (output_dir / 'full-book.txt').write_text(full_book_txt, encoding='utf-8')
    (output_dir / 'manifest.json').write_text(json.dumps({
        'source_epub': str(epub_path.name),
        'metadata': metadata,
        'chapter_count': len(manifest_entries),
        'chapters': manifest_entries,
    }, indent=2), encoding='utf-8')

    toc_lines = [
        '# The Pocket Universal Principles of Color',
        '',
        '## Extraction Outputs',
        '',
        f'- Source EPUB: `{epub_path.name}`',
        f'- Full markdown corpus: [full-book.md](./full-book.md)',
        f'- Full plain-text corpus: [full-book.txt](./full-book.txt)',
        f'- Chapter manifest: [manifest.json](./manifest.json)',
        f'- Chapter files: `chapters/` ({len(manifest_entries)} files)',
        '',
        '## Bibliographic Metadata',
        '',
        f'- Title: {metadata.get("title", "")}',
        f'- Creator: {metadata.get("creator", "")}',
        f'- Publisher: {metadata.get("publisher", "")}',
        f'- Language: {metadata.get("language", "")}',
        f'- Identifier: {metadata.get("identifier", "")}',
        '',
        '## Notes',
        '',
        '- This directory contains an extraction, not a summary.',
        '- The original EPUB remains the authoritative source asset in the repo root.',
        '- Markdown preserves chapter order and heading structure for human reading.',
        '- Plain text is included for grep, indexing, and LLM-oriented retrieval.',
    ]
    (output_dir / 'README.md').write_text('\n'.join(toc_lines) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
