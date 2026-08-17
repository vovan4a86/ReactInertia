<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Минималистичная санитизация HTML из WYSIWYG-редактора.
 *
 * Отличия от прежней реализации:
 *  - htmlspecialchars(..., double_encode: false) — больше нет накопительного
 *    экранирования (&amp;amp;amp;) при каждом пересохранении;
 *  - вырезаются javascript:/data: в href/src;
 *  - самозакрывающиеся теги не ломаются (<br/>, <img/>).
 */
final class HtmlSanitizer
{
    private const ALLOWED_TAGS = '<p><br><strong><b><em><i><u><s><del><ins><mark><span><div>'
    . '<h1><h2><h3><h4><h5><h6><ul><ol><li><blockquote><pre><code>'
    . '<a><img><figure><figcaption><table><thead><tbody><tfoot><tr><th><td><hr><sub><sup>';

    private const ALLOWED_ATTRIBUTES = [
        'href', 'src', 'srcset', 'alt', 'title', 'target', 'rel', 'class', 'id', 'style',
        'align', 'width', 'height', 'colspan', 'rowspan', 'start', 'type', 'reversed',
        'loading', 'data-type', 'data-checked',
    ];

    private const URL_ATTRIBUTES = ['href', 'src', 'srcset'];

    public static function clean(?string $html): string
    {
        if ($html === null || trim($html) === '') {
            return '';
        }

        $html = strip_tags($html, self::ALLOWED_TAGS);

        return (string) preg_replace_callback(
            '/<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*)?)(\/?)>/',
            static function (array $m): string {
                [$full, $tag, $rawAttrs, $selfClose] = $m;

                $clean = '';
                preg_match_all(
                    '/([a-zA-Z_:][\w:.-]*)\s*=\s*"([^"]*)"|([a-zA-Z_:][\w:.-]*)\s*=\s*\'([^\']*)\'/',
                    $rawAttrs,
                    $attrs,
                    PREG_SET_ORDER
                );

                foreach ($attrs as $attr) {
                    $name  = strtolower($attr[1] !== '' ? $attr[1] : ($attr[3] ?? ''));
                    $value = $attr[1] !== '' ? $attr[2] : ($attr[4] ?? '');

                    if (!in_array($name, self::ALLOWED_ATTRIBUTES, true)) {
                        continue;
                    }

                    if (in_array($name, self::URL_ATTRIBUTES, true) && self::isDangerousUrl($value)) {
                        continue;
                    }

                    $value  = htmlspecialchars($value, ENT_QUOTES, 'UTF-8', false);
                    $clean .= sprintf(' %s="%s"', $name, $value);
                }

                return sprintf('<%s%s%s>', $tag, $clean, $selfClose);
            },
            $html
        );
    }

    private static function isDangerousUrl(string $url): bool
    {
        $normalized = strtolower(preg_replace('/\s+/', '', $url) ?? '');

        return str_starts_with($normalized, 'javascript:')
            || str_starts_with($normalized, 'vbscript:')
            || (str_starts_with($normalized, 'data:') && !str_starts_with($normalized, 'data:image/'));
    }

    /** Полностью убрать разметку (для однострочных текстовых настроек). */
    public static function plain(?string $value): string
    {
        return $value === null ? '' : trim(strip_tags($value));
    }
}
