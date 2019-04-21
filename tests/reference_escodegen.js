"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

(function () {
    function r(e, n, t) {
        function o(i, f) {
            if (!n[i]) {
                if (!e[i]) {
                    var c = "function" == typeof require && require;if (!f && c) return c(i, !0);if (u) return u(i, !0);var a = new Error("Cannot find module '" + i + "'");throw a.code = "MODULE_NOT_FOUND", a;
                }var p = n[i] = { exports: {} };e[i][0].call(p.exports, function (r) {
                    var n = e[i][1][r];return o(n || r);
                }, p, p.exports, r, e, n, t);
            }return n[i].exports;
        }for (var u = "function" == typeof require && require, i = 0; i < t.length; i++) {
            o(t[i]);
        }return o;
    }return r;
})()({ 1: [function (require, module, exports) {
        (function (global) {
            /*
              Copyright (C) 2012-2014 Yusuke Suzuki <utatane.tea@gmail.com>
              Copyright (C) 2015 Ingvar Stepanyan <me@rreverser.com>
              Copyright (C) 2014 Ivan Nikulin <ifaaan@gmail.com>
              Copyright (C) 2012-2013 Michael Ficarra <escodegen.copyright@michael.ficarra.me>
              Copyright (C) 2012-2013 Mathias Bynens <mathias@qiwi.be>
              Copyright (C) 2013 Irakli Gozalishvili <rfobic@gmail.com>
              Copyright (C) 2012 Robert Gust-Bardon <donate@robert.gust-bardon.org>
              Copyright (C) 2012 John Freeman <jfreeman08@gmail.com>
              Copyright (C) 2011-2012 Ariya Hidayat <ariya.hidayat@gmail.com>
              Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
              Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
              Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>

              Redistribution and use in source and binary forms, with or without
              modification, are permitted provided that the following conditions are met:

                * Redistributions of source code must retain the above copyright
                  notice, this list of conditions and the following disclaimer.
                * Redistributions in binary form must reproduce the above copyright
                  notice, this list of conditions and the following disclaimer in the
                  documentation and/or other materials provided with the distribution.

              THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
              AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
              IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
              ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
              DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
              (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
              LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
              ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
              (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
              THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
            */

            /*global exports:true, require:true, global:true*/
            (function () {
                'use strict';

                var Syntax, Precedence, BinaryPrecedence, SourceNode, estraverse, esutils, base, indent, json, renumber, hexadecimal, quotes, escapeless, newline, space, parentheses, semicolons, safeConcatenation, directive, extra, parse, sourceMap, sourceCode, preserveBlankLines, FORMAT_MINIFY, FORMAT_DEFAULTS;

                estraverse = require('estraverse');
                esutils = require('esutils');

                Syntax = estraverse.Syntax;

                // Generation is done by generateExpression.
                function isExpression(node) {
                    return CodeGenerator.Expression.hasOwnProperty(node.type);
                }

                // Generation is done by generateStatement.
                function isStatement(node) {
                    return CodeGenerator.Statement.hasOwnProperty(node.type);
                }

                Precedence = {
                    Sequence: 0,
                    Yield: 1,
                    Assignment: 1,
                    Conditional: 2,
                    ArrowFunction: 2,
                    LogicalOR: 3,
                    LogicalAND: 4,
                    BitwiseOR: 5,
                    BitwiseXOR: 6,
                    BitwiseAND: 7,
                    Equality: 8,
                    Relational: 9,
                    BitwiseSHIFT: 10,
                    Additive: 11,
                    Multiplicative: 12,
                    Await: 13,
                    Unary: 13,
                    Postfix: 14,
                    Call: 15,
                    New: 16,
                    TaggedTemplate: 17,
                    Member: 18,
                    Primary: 19
                };

                BinaryPrecedence = {
                    '||': Precedence.LogicalOR,
                    '&&': Precedence.LogicalAND,
                    '|': Precedence.BitwiseOR,
                    '^': Precedence.BitwiseXOR,
                    '&': Precedence.BitwiseAND,
                    '==': Precedence.Equality,
                    '!=': Precedence.Equality,
                    '===': Precedence.Equality,
                    '!==': Precedence.Equality,
                    'is': Precedence.Equality,
                    'isnt': Precedence.Equality,
                    '<': Precedence.Relational,
                    '>': Precedence.Relational,
                    '<=': Precedence.Relational,
                    '>=': Precedence.Relational,
                    'in': Precedence.Relational,
                    'instanceof': Precedence.Relational,
                    '<<': Precedence.BitwiseSHIFT,
                    '>>': Precedence.BitwiseSHIFT,
                    '>>>': Precedence.BitwiseSHIFT,
                    '+': Precedence.Additive,
                    '-': Precedence.Additive,
                    '*': Precedence.Multiplicative,
                    '%': Precedence.Multiplicative,
                    '/': Precedence.Multiplicative
                };

                //Flags
                var F_ALLOW_IN = 1,
                    F_ALLOW_CALL = 1 << 1,
                    F_ALLOW_UNPARATH_NEW = 1 << 2,
                    F_FUNC_BODY = 1 << 3,
                    F_DIRECTIVE_CTX = 1 << 4,
                    F_SEMICOLON_OPT = 1 << 5;

                //Expression flag sets
                //NOTE: Flag order:
                // F_ALLOW_IN
                // F_ALLOW_CALL
                // F_ALLOW_UNPARATH_NEW
                var E_FTT = F_ALLOW_CALL | F_ALLOW_UNPARATH_NEW,
                    E_TTF = F_ALLOW_IN | F_ALLOW_CALL,
                    E_TTT = F_ALLOW_IN | F_ALLOW_CALL | F_ALLOW_UNPARATH_NEW,
                    E_TFF = F_ALLOW_IN,
                    E_FFT = F_ALLOW_UNPARATH_NEW,
                    E_TFT = F_ALLOW_IN | F_ALLOW_UNPARATH_NEW;

                //Statement flag sets
                //NOTE: Flag order:
                // F_ALLOW_IN
                // F_FUNC_BODY
                // F_DIRECTIVE_CTX
                // F_SEMICOLON_OPT
                var S_TFFF = F_ALLOW_IN,
                    S_TFFT = F_ALLOW_IN | F_SEMICOLON_OPT,
                    S_FFFF = 0x00,
                    S_TFTF = F_ALLOW_IN | F_DIRECTIVE_CTX,
                    S_TTFF = F_ALLOW_IN | F_FUNC_BODY;

                function getDefaultOptions() {
                    // default options
                    return {
                        indent: null,
                        base: null,
                        parse: null,
                        comment: false,
                        format: {
                            indent: {
                                style: '    ',
                                base: 0,
                                adjustMultilineComment: false
                            },
                            newline: '\n',
                            space: ' ',
                            json: false,
                            renumber: false,
                            hexadecimal: false,
                            quotes: 'single',
                            escapeless: false,
                            compact: false,
                            parentheses: true,
                            semicolons: true,
                            safeConcatenation: false,
                            preserveBlankLines: false
                        },
                        moz: {
                            comprehensionExpressionStartsWithAssignment: false,
                            starlessGenerator: false
                        },
                        sourceMap: null,
                        sourceMapRoot: null,
                        sourceMapWithCode: false,
                        directive: false,
                        raw: true,
                        verbatim: null,
                        sourceCode: null
                    };
                }

                function stringRepeat(str, num) {
                    var result = '';

                    for (num |= 0; num > 0; num >>>= 1, str += str) {
                        if (num & 1) {
                            result += str;
                        }
                    }

                    return result;
                }

                function hasLineTerminator(str) {
                    return (/[\r\n]/g.test(str)
                    );
                }

                function endsWithLineTerminator(str) {
                    var len = str.length;
                    return len && esutils.code.isLineTerminator(str.charCodeAt(len - 1));
                }

                function merge(target, override) {
                    var key;
                    for (key in override) {
                        if (override.hasOwnProperty(key)) {
                            target[key] = override[key];
                        }
                    }
                    return target;
                }

                function updateDeeply(target, override) {
                    var key, val;

                    function isHashObject(target) {
                        return (typeof target === "undefined" ? "undefined" : _typeof(target)) === 'object' && target instanceof Object && !(target instanceof RegExp);
                    }

                    for (key in override) {
                        if (override.hasOwnProperty(key)) {
                            val = override[key];
                            if (isHashObject(val)) {
                                if (isHashObject(target[key])) {
                                    updateDeeply(target[key], val);
                                } else {
                                    target[key] = updateDeeply({}, val);
                                }
                            } else {
                                target[key] = val;
                            }
                        }
                    }
                    return target;
                }

                function generateNumber(value) {
                    var result, point, temp, exponent, pos;

                    if (value !== value) {
                        throw new Error('Numeric literal whose value is NaN');
                    }
                    if (value < 0 || value === 0 && 1 / value < 0) {
                        throw new Error('Numeric literal whose value is negative');
                    }

                    if (value === 1 / 0) {
                        return json ? 'null' : renumber ? '1e400' : '1e+400';
                    }

                    result = '' + value;
                    if (!renumber || result.length < 3) {
                        return result;
                    }

                    point = result.indexOf('.');
                    if (!json && result.charCodeAt(0) === 0x30 /* 0 */ && point === 1) {
                        point = 0;
                        result = result.slice(1);
                    }
                    temp = result;
                    result = result.replace('e+', 'e');
                    exponent = 0;
                    if ((pos = temp.indexOf('e')) > 0) {
                        exponent = +temp.slice(pos + 1);
                        temp = temp.slice(0, pos);
                    }
                    if (point >= 0) {
                        exponent -= temp.length - point - 1;
                        temp = +(temp.slice(0, point) + temp.slice(point + 1)) + '';
                    }
                    pos = 0;
                    while (temp.charCodeAt(temp.length + pos - 1) === 0x30 /* 0 */) {
                        --pos;
                    }
                    if (pos !== 0) {
                        exponent -= pos;
                        temp = temp.slice(0, pos);
                    }
                    if (exponent !== 0) {
                        temp += 'e' + exponent;
                    }
                    if ((temp.length < result.length || hexadecimal && value > 1e12 && Math.floor(value) === value && (temp = '0x' + value.toString(16)).length < result.length) && +temp === value) {
                        result = temp;
                    }

                    return result;
                }

                // Generate valid RegExp expression.
                // This function is based on https://github.com/Constellation/iv Engine

                function escapeRegExpCharacter(ch, previousIsBackslash) {
                    // not handling '\' and handling \u2028 or \u2029 to unicode escape sequence
                    if ((ch & ~1) === 0x2028) {
                        return (previousIsBackslash ? 'u' : "\\u") + (ch === 0x2028 ? '2028' : '2029');
                    } else if (ch === 10 || ch === 13) {
                        // \n, \r
                        return (previousIsBackslash ? '' : '\\') + (ch === 10 ? 'n' : 'r');
                    }
                    return String.fromCharCode(ch);
                }

                function generateRegExp(reg) {
                    var match, result, flags, i, iz, ch, characterInBrack, previousIsBackslash;

                    result = reg.toString();

                    if (reg.source) {
                        // extract flag from toString result
                        match = result.match(/\/([^/]*)$/);
                        if (!match) {
                            return result;
                        }

                        flags = match[1];
                        result = '';

                        characterInBrack = false;
                        previousIsBackslash = false;
                        for (i = 0, iz = reg.source.length; i < iz; ++i) {
                            ch = reg.source.charCodeAt(i);

                            if (!previousIsBackslash) {
                                if (characterInBrack) {
                                    if (ch === 93) {
                                        // ]
                                        characterInBrack = false;
                                    }
                                } else {
                                    if (ch === 47) {
                                        // /
                                        result += '\\';
                                    } else if (ch === 91) {
                                        // [
                                        characterInBrack = true;
                                    }
                                }
                                result += escapeRegExpCharacter(ch, previousIsBackslash);
                                previousIsBackslash = ch === 92; // \
                            } else {
                                // if new RegExp("\\\n') is provided, create /\n/
                                result += escapeRegExpCharacter(ch, previousIsBackslash);
                                // prevent like /\\[/]/
                                previousIsBackslash = false;
                            }
                        }

                        return '/' + result + '/' + flags;
                    }

                    return result;
                }

                function escapeAllowedCharacter(code, next) {
                    var hex;

                    if (code === 0x08 /* \b */) {
                            return '\\b';
                        }

                    if (code === 0x0C /* \f */) {
                            return '\\f';
                        }

                    if (code === 0x09 /* \t */) {
                            return '\\t';
                        }

                    hex = code.toString(16).toUpperCase();
                    if (json || code > 0xFF) {
                        return "\\u" + '0000'.slice(hex.length) + hex;
                    } else if (code === 0x0000 && !esutils.code.isDecimalDigit(next)) {
                        return '\\0';
                    } else if (code === 0x000B /* \v */) {
                            // '\v'
                            return '\\x0B';
                        } else {
                        return '\\x' + '00'.slice(hex.length) + hex;
                    }
                }

                function escapeDisallowedCharacter(code) {
                    if (code === 0x5C /* \ */) {
                            return '\\\\';
                        }

                    if (code === 0x0A /* \n */) {
                            return '\\n';
                        }

                    if (code === 0x0D /* \r */) {
                            return '\\r';
                        }

                    if (code === 0x2028) {
                        return "\\u2028";
                    }

                    if (code === 0x2029) {
                        return "\\u2029";
                    }

                    throw new Error('Incorrectly classified character');
                }

                function escapeDirective(str) {
                    var i, iz, code, quote;

                    quote = quotes === 'double' ? '"' : '\'';
                    for (i = 0, iz = str.length; i < iz; ++i) {
                        code = str.charCodeAt(i);
                        if (code === 0x27 /* ' */) {
                                quote = '"';
                                break;
                            } else if (code === 0x22 /* " */) {
                                quote = '\'';
                                break;
                            } else if (code === 0x5C /* \ */) {
                                ++i;
                            }
                    }

                    return quote + str + quote;
                }

                function escapeString(str) {
                    var result = '',
                        i,
                        len,
                        code,
                        singleQuotes = 0,
                        doubleQuotes = 0,
                        single,
                        quote;

                    for (i = 0, len = str.length; i < len; ++i) {
                        code = str.charCodeAt(i);
                        if (code === 0x27 /* ' */) {
                                ++singleQuotes;
                            } else if (code === 0x22 /* " */) {
                                ++doubleQuotes;
                            } else if (code === 0x2F /* / */ && json) {
                            result += '\\';
                        } else if (esutils.code.isLineTerminator(code) || code === 0x5C /* \ */) {
                                result += escapeDisallowedCharacter(code);
                                continue;
                            } else if (!esutils.code.isIdentifierPartES5(code) && (json && code < 0x20 /* SP */ || !json && !escapeless && (code < 0x20 /* SP */ || code > 0x7E /* ~ */))) {
                            result += escapeAllowedCharacter(code, str.charCodeAt(i + 1));
                            continue;
                        }
                        result += String.fromCharCode(code);
                    }

                    single = !(quotes === 'double' || quotes === 'auto' && doubleQuotes < singleQuotes);
                    quote = single ? '\'' : '"';

                    if (!(single ? singleQuotes : doubleQuotes)) {
                        return quote + result + quote;
                    }

                    str = result;
                    result = quote;

                    for (i = 0, len = str.length; i < len; ++i) {
                        code = str.charCodeAt(i);
                        if (code === 0x27 /* ' */ && single || code === 0x22 /* " */ && !single) {
                            result += '\\';
                        }
                        result += String.fromCharCode(code);
                    }

                    return result + quote;
                }

                /**
                 * flatten an array to a string, where the array can contain
                 * either strings or nested arrays
                 */
                function flattenToString(arr) {
                    var i,
                        iz,
                        elem,
                        result = '';
                    for (i = 0, iz = arr.length; i < iz; ++i) {
                        elem = arr[i];
                        result += Array.isArray(elem) ? flattenToString(elem) : elem;
                    }
                    return result;
                }

                /**
                 * convert generated to a SourceNode when source maps are enabled.
                 */
                function toSourceNodeWhenNeeded(generated, node) {
                    if (!sourceMap) {
                        // with no source maps, generated is either an
                        // array or a string.  if an array, flatten it.
                        // if a string, just return it
                        if (Array.isArray(generated)) {
                            return flattenToString(generated);
                        } else {
                            return generated;
                        }
                    }
                    if (node == null) {
                        if (generated instanceof SourceNode) {
                            return generated;
                        } else {
                            node = {};
                        }
                    }
                    if (node.loc == null) {
                        return new SourceNode(null, null, sourceMap, generated, node.name || null);
                    }
                    return new SourceNode(node.loc.start.line, node.loc.start.column, sourceMap === true ? node.loc.source || null : sourceMap, generated, node.name || null);
                }

                function noEmptySpace() {
                    return space ? space : ' ';
                }

                function join(left, right) {
                    var leftSource, rightSource, leftCharCode, rightCharCode;

                    leftSource = toSourceNodeWhenNeeded(left).toString();
                    if (leftSource.length === 0) {
                        return [right];
                    }

                    rightSource = toSourceNodeWhenNeeded(right).toString();
                    if (rightSource.length === 0) {
                        return [left];
                    }

                    leftCharCode = leftSource.charCodeAt(leftSource.length - 1);
                    rightCharCode = rightSource.charCodeAt(0);

                    if ((leftCharCode === 0x2B /* + */ || leftCharCode === 0x2D /* - */) && leftCharCode === rightCharCode || esutils.code.isIdentifierPartES5(leftCharCode) && esutils.code.isIdentifierPartES5(rightCharCode) || leftCharCode === 0x2F /* / */ && rightCharCode === 0x69 /* i */) {
                            // infix word operators all start with `i`
                            return [left, noEmptySpace(), right];
                        } else if (esutils.code.isWhiteSpace(leftCharCode) || esutils.code.isLineTerminator(leftCharCode) || esutils.code.isWhiteSpace(rightCharCode) || esutils.code.isLineTerminator(rightCharCode)) {
                        return [left, right];
                    }
                    return [left, space, right];
                }

                function addIndent(stmt) {
                    return [base, stmt];
                }

                function withIndent(fn) {
                    var previousBase;
                    previousBase = base;
                    base += indent;
                    fn(base);
                    base = previousBase;
                }

                function calculateSpaces(str) {
                    var i;
                    for (i = str.length - 1; i >= 0; --i) {
                        if (esutils.code.isLineTerminator(str.charCodeAt(i))) {
                            break;
                        }
                    }
                    return str.length - 1 - i;
                }

                function adjustMultilineComment(value, specialBase) {
                    var array, i, len, line, j, spaces, previousBase, sn;

                    array = value.split(/\r\n|[\r\n]/);
                    spaces = Number.MAX_VALUE;

                    // first line doesn't have indentation
                    for (i = 1, len = array.length; i < len; ++i) {
                        line = array[i];
                        j = 0;
                        while (j < line.length && esutils.code.isWhiteSpace(line.charCodeAt(j))) {
                            ++j;
                        }
                        if (spaces > j) {
                            spaces = j;
                        }
                    }

                    if (typeof specialBase !== 'undefined') {
                        // pattern like
                        // {
                        //   var t = 20;  /*
                        //                 * this is comment
                        //                 */
                        // }
                        previousBase = base;
                        if (array[1][spaces] === '*') {
                            specialBase += ' ';
                        }
                        base = specialBase;
                    } else {
                        if (spaces & 1) {
                            // /*
                            //  *
                            //  */
                            // If spaces are odd number, above pattern is considered.
                            // We waste 1 space.
                            --spaces;
                        }
                        previousBase = base;
                    }

                    for (i = 1, len = array.length; i < len; ++i) {
                        sn = toSourceNodeWhenNeeded(addIndent(array[i].slice(spaces)));
                        array[i] = sourceMap ? sn.join('') : sn;
                    }

                    base = previousBase;

                    return array.join('\n');
                }

                function generateComment(comment, specialBase) {
                    if (comment.type === 'Line') {
                        if (endsWithLineTerminator(comment.value)) {
                            return '//' + comment.value;
                        } else {
                            // Always use LineTerminator
                            var result = '//' + comment.value;
                            if (!preserveBlankLines) {
                                result += '\n';
                            }
                            return result;
                        }
                    }
                    if (extra.format.indent.adjustMultilineComment && /[\n\r]/.test(comment.value)) {
                        return adjustMultilineComment('/*' + comment.value + '*/', specialBase);
                    }
                    return '/*' + comment.value + '*/';
                }

                function addComments(stmt, result) {
                    var i, len, comment, save, tailingToStatement, specialBase, fragment, extRange, range, prevRange, prefix, infix, suffix, count;

                    if (stmt.leadingComments && stmt.leadingComments.length > 0) {
                        save = result;

                        if (preserveBlankLines) {
                            comment = stmt.leadingComments[0];
                            result = [];

                            extRange = comment.extendedRange;
                            range = comment.range;

                            prefix = sourceCode.substring(extRange[0], range[0]);
                            count = (prefix.match(/\n/g) || []).length;
                            if (count > 0) {
                                result.push(stringRepeat('\n', count));
                                result.push(addIndent(generateComment(comment)));
                            } else {
                                result.push(prefix);
                                result.push(generateComment(comment));
                            }

                            prevRange = range;

                            for (i = 1, len = stmt.leadingComments.length; i < len; i++) {
                                comment = stmt.leadingComments[i];
                                range = comment.range;

                                infix = sourceCode.substring(prevRange[1], range[0]);
                                count = (infix.match(/\n/g) || []).length;
                                result.push(stringRepeat('\n', count));
                                result.push(addIndent(generateComment(comment)));

                                prevRange = range;
                            }

                            suffix = sourceCode.substring(range[1], extRange[1]);
                            count = (suffix.match(/\n/g) || []).length;
                            result.push(stringRepeat('\n', count));
                        } else {
                            comment = stmt.leadingComments[0];
                            result = [];
                            if (safeConcatenation && stmt.type === Syntax.Program && stmt.body.length === 0) {
                                result.push('\n');
                            }
                            result.push(generateComment(comment));
                            if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                                result.push('\n');
                            }

                            for (i = 1, len = stmt.leadingComments.length; i < len; ++i) {
                                comment = stmt.leadingComments[i];
                                fragment = [generateComment(comment)];
                                if (!endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                                    fragment.push('\n');
                                }
                                result.push(addIndent(fragment));
                            }
                        }

                        result.push(addIndent(save));
                    }

                    if (stmt.trailingComments) {

                        if (preserveBlankLines) {
                            comment = stmt.trailingComments[0];
                            extRange = comment.extendedRange;
                            range = comment.range;

                            prefix = sourceCode.substring(extRange[0], range[0]);
                            count = (prefix.match(/\n/g) || []).length;

                            if (count > 0) {
                                result.push(stringRepeat('\n', count));
                                result.push(addIndent(generateComment(comment)));
                            } else {
                                result.push(prefix);
                                result.push(generateComment(comment));
                            }
                        } else {
                            tailingToStatement = !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString());
                            specialBase = stringRepeat(' ', calculateSpaces(toSourceNodeWhenNeeded([base, result, indent]).toString()));
                            for (i = 0, len = stmt.trailingComments.length; i < len; ++i) {
                                comment = stmt.trailingComments[i];
                                if (tailingToStatement) {
                                    // We assume target like following script
                                    //
                                    // var t = 20;  /**
                                    //               * This is comment of t
                                    //               */
                                    if (i === 0) {
                                        // first case
                                        result = [result, indent];
                                    } else {
                                        result = [result, specialBase];
                                    }
                                    result.push(generateComment(comment, specialBase));
                                } else {
                                    result = [result, addIndent(generateComment(comment))];
                                }
                                if (i !== len - 1 && !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                                    result = [result, '\n'];
                                }
                            }
                        }
                    }

                    return result;
                }

                function generateBlankLines(start, end, result) {
                    var j,
                        newlineCount = 0;

                    for (j = start; j < end; j++) {
                        if (sourceCode[j] === '\n') {
                            newlineCount++;
                        }
                    }

                    for (j = 1; j < newlineCount; j++) {
                        result.push(newline);
                    }
                }

                function parenthesize(text, current, should) {
                    if (current < should) {
                        return ['(', text, ')'];
                    }
                    return text;
                }

                function generateVerbatimString(string) {
                    var i, iz, result;
                    result = string.split(/\r\n|\n/);
                    for (i = 1, iz = result.length; i < iz; i++) {
                        result[i] = newline + base + result[i];
                    }
                    return result;
                }

                function generateVerbatim(expr, precedence) {
                    var verbatim, result, prec;
                    verbatim = expr[extra.verbatim];

                    if (typeof verbatim === 'string') {
                        result = parenthesize(generateVerbatimString(verbatim), Precedence.Sequence, precedence);
                    } else {
                        // verbatim is object
                        result = generateVerbatimString(verbatim.content);
                        prec = verbatim.precedence != null ? verbatim.precedence : Precedence.Sequence;
                        result = parenthesize(result, prec, precedence);
                    }

                    return toSourceNodeWhenNeeded(result, expr);
                }

                function CodeGenerator() {}

                // Helpers.

                CodeGenerator.prototype.maybeBlock = function (stmt, flags) {
                    var result,
                        noLeadingComment,
                        that = this;

                    noLeadingComment = !extra.comment || !stmt.leadingComments;

                    if (stmt.type === Syntax.BlockStatement && noLeadingComment) {
                        return [space, this.generateStatement(stmt, flags)];
                    }

                    if (stmt.type === Syntax.EmptyStatement && noLeadingComment) {
                        return ';';
                    }

                    withIndent(function () {
                        result = [newline, addIndent(that.generateStatement(stmt, flags))];
                    });

                    return result;
                };

                CodeGenerator.prototype.maybeBlockSuffix = function (stmt, result) {
                    var ends = endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString());
                    if (stmt.type === Syntax.BlockStatement && (!extra.comment || !stmt.leadingComments) && !ends) {
                        return [result, space];
                    }
                    if (ends) {
                        return [result, base];
                    }
                    return [result, newline, base];
                };

                function generateIdentifier(node) {
                    return toSourceNodeWhenNeeded(node.name, node);
                }

                function generateAsyncPrefix(node, spaceRequired) {
                    return node.async ? 'async' + (spaceRequired ? noEmptySpace() : space) : '';
                }

                function generateStarSuffix(node) {
                    var isGenerator = node.generator && !extra.moz.starlessGenerator;
                    return isGenerator ? '*' + space : '';
                }

                function generateMethodPrefix(prop) {
                    var func = prop.value,
                        prefix = '';
                    if (func.async) {
                        prefix += generateAsyncPrefix(func, !prop.computed);
                    }
                    if (func.generator) {
                        // avoid space before method name
                        prefix += generateStarSuffix(func) ? '*' : '';
                    }
                    return prefix;
                }

                CodeGenerator.prototype.generatePattern = function (node, precedence, flags) {
                    if (node.type === Syntax.Identifier) {
                        return generateIdentifier(node);
                    }
                    return this.generateExpression(node, precedence, flags);
                };

                CodeGenerator.prototype.generateFunctionParams = function (node) {
                    var i, iz, result, hasDefault;

                    hasDefault = false;

                    if (node.type === Syntax.ArrowFunctionExpression && !node.rest && (!node.defaults || node.defaults.length === 0) && node.params.length === 1 && node.params[0].type === Syntax.Identifier) {
                        // arg => { } case
                        result = [generateAsyncPrefix(node, true), generateIdentifier(node.params[0])];
                    } else {
                        result = node.type === Syntax.ArrowFunctionExpression ? [generateAsyncPrefix(node, false)] : [];
                        result.push('(');
                        if (node.defaults) {
                            hasDefault = true;
                        }
                        for (i = 0, iz = node.params.length; i < iz; ++i) {
                            if (hasDefault && node.defaults[i]) {
                                // Handle default values.
                                result.push(this.generateAssignment(node.params[i], node.defaults[i], '=', Precedence.Assignment, E_TTT));
                            } else {
                                result.push(this.generatePattern(node.params[i], Precedence.Assignment, E_TTT));
                            }
                            if (i + 1 < iz) {
                                result.push(',' + space);
                            }
                        }

                        if (node.rest) {
                            if (node.params.length) {
                                result.push(',' + space);
                            }
                            result.push('...');
                            result.push(generateIdentifier(node.rest));
                        }

                        result.push(')');
                    }

                    return result;
                };

                CodeGenerator.prototype.generateFunctionBody = function (node) {
                    var result, expr;

                    result = this.generateFunctionParams(node);

                    if (node.type === Syntax.ArrowFunctionExpression) {
                        result.push(space);
                        result.push('=>');
                    }

                    if (node.expression) {
                        result.push(space);
                        expr = this.generateExpression(node.body, Precedence.Assignment, E_TTT);
                        if (expr.toString().charAt(0) === '{') {
                            expr = ['(', expr, ')'];
                        }
                        result.push(expr);
                    } else {
                        result.push(this.maybeBlock(node.body, S_TTFF));
                    }

                    return result;
                };

                CodeGenerator.prototype.generateIterationForStatement = function (operator, stmt, flags) {
                    var result = ['for' + space + (stmt.await ? 'await' + space : '') + '('],
                        that = this;
                    withIndent(function () {
                        if (stmt.left.type === Syntax.VariableDeclaration) {
                            withIndent(function () {
                                result.push(stmt.left.kind + noEmptySpace());
                                result.push(that.generateStatement(stmt.left.declarations[0], S_FFFF));
                            });
                        } else {
                            result.push(that.generateExpression(stmt.left, Precedence.Call, E_TTT));
                        }

                        result = join(result, operator);
                        result = [join(result, that.generateExpression(stmt.right, Precedence.Assignment, E_TTT)), ')'];
                    });
                    result.push(this.maybeBlock(stmt.body, flags));
                    return result;
                };

                CodeGenerator.prototype.generatePropertyKey = function (expr, computed) {
                    var result = [];

                    if (computed) {
                        result.push('[');
                    }

                    result.push(this.generateExpression(expr, Precedence.Sequence, E_TTT));

                    if (computed) {
                        result.push(']');
                    }

                    return result;
                };

                CodeGenerator.prototype.generateAssignment = function (left, right, operator, precedence, flags) {
                    if (Precedence.Assignment < precedence) {
                        flags |= F_ALLOW_IN;
                    }

                    return parenthesize([this.generateExpression(left, Precedence.Call, flags), space + operator + space, this.generateExpression(right, Precedence.Assignment, flags)], Precedence.Assignment, precedence);
                };

                CodeGenerator.prototype.semicolon = function (flags) {
                    if (!semicolons && flags & F_SEMICOLON_OPT) {
                        return '';
                    }
                    return ';';
                };

                // Statements.

                CodeGenerator.Statement = {

                    BlockStatement: function BlockStatement(stmt, flags) {
                        var range,
                            content,
                            result = ['{', newline],
                            that = this;

                        withIndent(function () {
                            // handle functions without any code
                            if (stmt.body.length === 0 && preserveBlankLines) {
                                range = stmt.range;
                                if (range[1] - range[0] > 2) {
                                    content = sourceCode.substring(range[0] + 1, range[1] - 1);
                                    if (content[0] === '\n') {
                                        result = ['{'];
                                    }
                                    result.push(content);
                                }
                            }

                            var i, iz, fragment, bodyFlags;
                            bodyFlags = S_TFFF;
                            if (flags & F_FUNC_BODY) {
                                bodyFlags |= F_DIRECTIVE_CTX;
                            }

                            for (i = 0, iz = stmt.body.length; i < iz; ++i) {
                                if (preserveBlankLines) {
                                    // handle spaces before the first line
                                    if (i === 0) {
                                        if (stmt.body[0].leadingComments) {
                                            range = stmt.body[0].leadingComments[0].extendedRange;
                                            content = sourceCode.substring(range[0], range[1]);
                                            if (content[0] === '\n') {
                                                result = ['{'];
                                            }
                                        }
                                        if (!stmt.body[0].leadingComments) {
                                            generateBlankLines(stmt.range[0], stmt.body[0].range[0], result);
                                        }
                                    }

                                    // handle spaces between lines
                                    if (i > 0) {
                                        if (!stmt.body[i - 1].trailingComments && !stmt.body[i].leadingComments) {
                                            generateBlankLines(stmt.body[i - 1].range[1], stmt.body[i].range[0], result);
                                        }
                                    }
                                }

                                if (i === iz - 1) {
                                    bodyFlags |= F_SEMICOLON_OPT;
                                }

                                if (stmt.body[i].leadingComments && preserveBlankLines) {
                                    fragment = that.generateStatement(stmt.body[i], bodyFlags);
                                } else {
                                    fragment = addIndent(that.generateStatement(stmt.body[i], bodyFlags));
                                }

                                result.push(fragment);
                                if (!endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                                    if (preserveBlankLines && i < iz - 1) {
                                        // don't add a new line if there are leading coments
                                        // in the next statement
                                        if (!stmt.body[i + 1].leadingComments) {
                                            result.push(newline);
                                        }
                                    } else {
                                        result.push(newline);
                                    }
                                }

                                if (preserveBlankLines) {
                                    // handle spaces after the last line
                                    if (i === iz - 1) {
                                        if (!stmt.body[i].trailingComments) {
                                            generateBlankLines(stmt.body[i].range[1], stmt.range[1], result);
                                        }
                                    }
                                }
                            }
                        });

                        result.push(addIndent('}'));
                        return result;
                    },

                    BreakStatement: function BreakStatement(stmt, flags) {
                        if (stmt.label) {
                            return 'break ' + stmt.label.name + this.semicolon(flags);
                        }
                        return 'break' + this.semicolon(flags);
                    },

                    ContinueStatement: function ContinueStatement(stmt, flags) {
                        if (stmt.label) {
                            return 'continue ' + stmt.label.name + this.semicolon(flags);
                        }
                        return 'continue' + this.semicolon(flags);
                    },

                    ClassBody: function ClassBody(stmt, flags) {
                        var result = ['{', newline],
                            that = this;

                        withIndent(function (indent) {
                            var i, iz;

                            for (i = 0, iz = stmt.body.length; i < iz; ++i) {
                                result.push(indent);
                                result.push(that.generateExpression(stmt.body[i], Precedence.Sequence, E_TTT));
                                if (i + 1 < iz) {
                                    result.push(newline);
                                }
                            }
                        });

                        if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                            result.push(newline);
                        }
                        result.push(base);
                        result.push('}');
                        return result;
                    },

                    ClassDeclaration: function ClassDeclaration(stmt, flags) {
                        var result, fragment;
                        result = ['class'];
                        if (stmt.id) {
                            result = join(result, this.generateExpression(stmt.id, Precedence.Sequence, E_TTT));
                        }
                        if (stmt.superClass) {
                            fragment = join('extends', this.generateExpression(stmt.superClass, Precedence.Assignment, E_TTT));
                            result = join(result, fragment);
                        }
                        result.push(space);
                        result.push(this.generateStatement(stmt.body, S_TFFT));
                        return result;
                    },

                    DirectiveStatement: function DirectiveStatement(stmt, flags) {
                        if (extra.raw && stmt.raw) {
                            return stmt.raw + this.semicolon(flags);
                        }
                        return escapeDirective(stmt.directive) + this.semicolon(flags);
                    },

                    DoWhileStatement: function DoWhileStatement(stmt, flags) {
                        // Because `do 42 while (cond)` is Syntax Error. We need semicolon.
                        var result = join('do', this.maybeBlock(stmt.body, S_TFFF));
                        result = this.maybeBlockSuffix(stmt.body, result);
                        return join(result, ['while' + space + '(', this.generateExpression(stmt.test, Precedence.Sequence, E_TTT), ')' + this.semicolon(flags)]);
                    },

                    CatchClause: function CatchClause(stmt, flags) {
                        var result,
                            that = this;
                        withIndent(function () {
                            var guard;

                            result = ['catch' + space + '(', that.generateExpression(stmt.param, Precedence.Sequence, E_TTT), ')'];

                            if (stmt.guard) {
                                guard = that.generateExpression(stmt.guard, Precedence.Sequence, E_TTT);
                                result.splice(2, 0, ' if ', guard);
                            }
                        });
                        result.push(this.maybeBlock(stmt.body, S_TFFF));
                        return result;
                    },

                    DebuggerStatement: function DebuggerStatement(stmt, flags) {
                        return 'debugger' + this.semicolon(flags);
                    },

                    EmptyStatement: function EmptyStatement(stmt, flags) {
                        return ';';
                    },

                    ExportDefaultDeclaration: function ExportDefaultDeclaration(stmt, flags) {
                        var result = ['export'],
                            bodyFlags;

                        bodyFlags = flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF;

                        // export default HoistableDeclaration[Default]
                        // export default AssignmentExpression[In] ;
                        result = join(result, 'default');
                        if (isStatement(stmt.declaration)) {
                            result = join(result, this.generateStatement(stmt.declaration, bodyFlags));
                        } else {
                            result = join(result, this.generateExpression(stmt.declaration, Precedence.Assignment, E_TTT) + this.semicolon(flags));
                        }
                        return result;
                    },

                    ExportNamedDeclaration: function ExportNamedDeclaration(stmt, flags) {
                        var result = ['export'],
                            bodyFlags,
                            that = this;

                        bodyFlags = flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF;

                        // export VariableStatement
                        // export Declaration[Default]
                        if (stmt.declaration) {
                            return join(result, this.generateStatement(stmt.declaration, bodyFlags));
                        }

                        // export ExportClause[NoReference] FromClause ;
                        // export ExportClause ;
                        if (stmt.specifiers) {
                            if (stmt.specifiers.length === 0) {
                                result = join(result, '{' + space + '}');
                            } else if (stmt.specifiers[0].type === Syntax.ExportBatchSpecifier) {
                                result = join(result, this.generateExpression(stmt.specifiers[0], Precedence.Sequence, E_TTT));
                            } else {
                                result = join(result, '{');
                                withIndent(function (indent) {
                                    var i, iz;
                                    result.push(newline);
                                    for (i = 0, iz = stmt.specifiers.length; i < iz; ++i) {
                                        result.push(indent);
                                        result.push(that.generateExpression(stmt.specifiers[i], Precedence.Sequence, E_TTT));
                                        if (i + 1 < iz) {
                                            result.push(',' + newline);
                                        }
                                    }
                                });
                                if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                                    result.push(newline);
                                }
                                result.push(base + '}');
                            }

                            if (stmt.source) {
                                result = join(result, ['from' + space,
                                // ModuleSpecifier
                                this.generateExpression(stmt.source, Precedence.Sequence, E_TTT), this.semicolon(flags)]);
                            } else {
                                result.push(this.semicolon(flags));
                            }
                        }
                        return result;
                    },

                    ExportAllDeclaration: function ExportAllDeclaration(stmt, flags) {
                        // export * FromClause ;
                        return ['export' + space, '*' + space, 'from' + space,
                        // ModuleSpecifier
                        this.generateExpression(stmt.source, Precedence.Sequence, E_TTT), this.semicolon(flags)];
                    },

                    ExpressionStatement: function ExpressionStatement(stmt, flags) {
                        var result, fragment;

                        function isClassPrefixed(fragment) {
                            var code;
                            if (fragment.slice(0, 5) !== 'class') {
                                return false;
                            }
                            code = fragment.charCodeAt(5);
                            return code === 0x7B /* '{' */ || esutils.code.isWhiteSpace(code) || esutils.code.isLineTerminator(code);
                        }

                        function isFunctionPrefixed(fragment) {
                            var code;
                            if (fragment.slice(0, 8) !== 'function') {
                                return false;
                            }
                            code = fragment.charCodeAt(8);
                            return code === 0x28 /* '(' */ || esutils.code.isWhiteSpace(code) || code === 0x2A /* '*' */ || esutils.code.isLineTerminator(code);
                        }

                        function isAsyncPrefixed(fragment) {
                            var code, i, iz;
                            if (fragment.slice(0, 5) !== 'async') {
                                return false;
                            }
                            if (!esutils.code.isWhiteSpace(fragment.charCodeAt(5))) {
                                return false;
                            }
                            for (i = 6, iz = fragment.length; i < iz; ++i) {
                                if (!esutils.code.isWhiteSpace(fragment.charCodeAt(i))) {
                                    break;
                                }
                            }
                            if (i === iz) {
                                return false;
                            }
                            if (fragment.slice(i, i + 8) !== 'function') {
                                return false;
                            }
                            code = fragment.charCodeAt(i + 8);
                            return code === 0x28 /* '(' */ || esutils.code.isWhiteSpace(code) || code === 0x2A /* '*' */ || esutils.code.isLineTerminator(code);
                        }

                        result = [this.generateExpression(stmt.expression, Precedence.Sequence, E_TTT)];
                        // 12.4 '{', 'function', 'class' is not allowed in this position.
                        // wrap expression with parentheses
                        fragment = toSourceNodeWhenNeeded(result).toString();
                        if (fragment.charCodeAt(0) === 0x7B /* '{' */ || // ObjectExpression
                        isClassPrefixed(fragment) || isFunctionPrefixed(fragment) || isAsyncPrefixed(fragment) || directive && flags & F_DIRECTIVE_CTX && stmt.expression.type === Syntax.Literal && typeof stmt.expression.value === 'string') {
                            result = ['(', result, ')' + this.semicolon(flags)];
                        } else {
                            result.push(this.semicolon(flags));
                        }
                        return result;
                    },

                    ImportDeclaration: function ImportDeclaration(stmt, flags) {
                        // ES6: 15.2.1 valid import declarations:
                        //     - import ImportClause FromClause ;
                        //     - import ModuleSpecifier ;
                        var result,
                            cursor,
                            that = this;

                        // If no ImportClause is present,
                        // this should be `import ModuleSpecifier` so skip `from`
                        // ModuleSpecifier is StringLiteral.
                        if (stmt.specifiers.length === 0) {
                            // import ModuleSpecifier ;
                            return ['import', space,
                            // ModuleSpecifier
                            this.generateExpression(stmt.source, Precedence.Sequence, E_TTT), this.semicolon(flags)];
                        }

                        // import ImportClause FromClause ;
                        result = ['import'];
                        cursor = 0;

                        // ImportedBinding
                        if (stmt.specifiers[cursor].type === Syntax.ImportDefaultSpecifier) {
                            result = join(result, [this.generateExpression(stmt.specifiers[cursor], Precedence.Sequence, E_TTT)]);
                            ++cursor;
                        }

                        if (stmt.specifiers[cursor]) {
                            if (cursor !== 0) {
                                result.push(',');
                            }

                            if (stmt.specifiers[cursor].type === Syntax.ImportNamespaceSpecifier) {
                                // NameSpaceImport
                                result = join(result, [space, this.generateExpression(stmt.specifiers[cursor], Precedence.Sequence, E_TTT)]);
                            } else {
                                // NamedImports
                                result.push(space + '{');

                                if (stmt.specifiers.length - cursor === 1) {
                                    // import { ... } from "...";
                                    result.push(space);
                                    result.push(this.generateExpression(stmt.specifiers[cursor], Precedence.Sequence, E_TTT));
                                    result.push(space + '}' + space);
                                } else {
                                    // import {
                                    //    ...,
                                    //    ...,
                                    // } from "...";
                                    withIndent(function (indent) {
                                        var i, iz;
                                        result.push(newline);
                                        for (i = cursor, iz = stmt.specifiers.length; i < iz; ++i) {
                                            result.push(indent);
                                            result.push(that.generateExpression(stmt.specifiers[i], Precedence.Sequence, E_TTT));
                                            if (i + 1 < iz) {
                                                result.push(',' + newline);
                                            }
                                        }
                                    });
                                    if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                                        result.push(newline);
                                    }
                                    result.push(base + '}' + space);
                                }
                            }
                        }

                        result = join(result, ['from' + space,
                        // ModuleSpecifier
                        this.generateExpression(stmt.source, Precedence.Sequence, E_TTT), this.semicolon(flags)]);
                        return result;
                    },

                    VariableDeclarator: function VariableDeclarator(stmt, flags) {
                        var itemFlags = flags & F_ALLOW_IN ? E_TTT : E_FTT;
                        if (stmt.init) {
                            return [this.generateExpression(stmt.id, Precedence.Assignment, itemFlags), space, '=', space, this.generateExpression(stmt.init, Precedence.Assignment, itemFlags)];
                        }
                        return this.generatePattern(stmt.id, Precedence.Assignment, itemFlags);
                    },

                    VariableDeclaration: function VariableDeclaration(stmt, flags) {
                        // VariableDeclarator is typed as Statement,
                        // but joined with comma (not LineTerminator).
                        // So if comment is attached to target node, we should specialize.
                        var result,
                            i,
                            iz,
                            node,
                            bodyFlags,
                            that = this;

                        result = [stmt.kind];

                        bodyFlags = flags & F_ALLOW_IN ? S_TFFF : S_FFFF;

                        function block() {
                            node = stmt.declarations[0];
                            if (extra.comment && node.leadingComments) {
                                result.push('\n');
                                result.push(addIndent(that.generateStatement(node, bodyFlags)));
                            } else {
                                result.push(noEmptySpace());
                                result.push(that.generateStatement(node, bodyFlags));
                            }

                            for (i = 1, iz = stmt.declarations.length; i < iz; ++i) {
                                node = stmt.declarations[i];
                                if (extra.comment && node.leadingComments) {
                                    result.push(',' + newline);
                                    result.push(addIndent(that.generateStatement(node, bodyFlags)));
                                } else {
                                    result.push(',' + space);
                                    result.push(that.generateStatement(node, bodyFlags));
                                }
                            }
                        }

                        if (stmt.declarations.length > 1) {
                            withIndent(block);
                        } else {
                            block();
                        }

                        result.push(this.semicolon(flags));

                        return result;
                    },

                    ThrowStatement: function ThrowStatement(stmt, flags) {
                        return [join('throw', this.generateExpression(stmt.argument, Precedence.Sequence, E_TTT)), this.semicolon(flags)];
                    },

                    TryStatement: function TryStatement(stmt, flags) {
                        var result, i, iz, guardedHandlers;

                        result = ['try', this.maybeBlock(stmt.block, S_TFFF)];
                        result = this.maybeBlockSuffix(stmt.block, result);

                        if (stmt.handlers) {
                            // old interface
                            for (i = 0, iz = stmt.handlers.length; i < iz; ++i) {
                                result = join(result, this.generateStatement(stmt.handlers[i], S_TFFF));
                                if (stmt.finalizer || i + 1 !== iz) {
                                    result = this.maybeBlockSuffix(stmt.handlers[i].body, result);
                                }
                            }
                        } else {
                            guardedHandlers = stmt.guardedHandlers || [];

                            for (i = 0, iz = guardedHandlers.length; i < iz; ++i) {
                                result = join(result, this.generateStatement(guardedHandlers[i], S_TFFF));
                                if (stmt.finalizer || i + 1 !== iz) {
                                    result = this.maybeBlockSuffix(guardedHandlers[i].body, result);
                                }
                            }

                            // new interface
                            if (stmt.handler) {
                                if (Array.isArray(stmt.handler)) {
                                    for (i = 0, iz = stmt.handler.length; i < iz; ++i) {
                                        result = join(result, this.generateStatement(stmt.handler[i], S_TFFF));
                                        if (stmt.finalizer || i + 1 !== iz) {
                                            result = this.maybeBlockSuffix(stmt.handler[i].body, result);
                                        }
                                    }
                                } else {
                                    result = join(result, this.generateStatement(stmt.handler, S_TFFF));
                                    if (stmt.finalizer) {
                                        result = this.maybeBlockSuffix(stmt.handler.body, result);
                                    }
                                }
                            }
                        }
                        if (stmt.finalizer) {
                            result = join(result, ['finally', this.maybeBlock(stmt.finalizer, S_TFFF)]);
                        }
                        return result;
                    },

                    SwitchStatement: function SwitchStatement(stmt, flags) {
                        var result,
                            fragment,
                            i,
                            iz,
                            bodyFlags,
                            that = this;
                        withIndent(function () {
                            result = ['switch' + space + '(', that.generateExpression(stmt.discriminant, Precedence.Sequence, E_TTT), ')' + space + '{' + newline];
                        });
                        if (stmt.cases) {
                            bodyFlags = S_TFFF;
                            for (i = 0, iz = stmt.cases.length; i < iz; ++i) {
                                if (i === iz - 1) {
                                    bodyFlags |= F_SEMICOLON_OPT;
                                }
                                fragment = addIndent(this.generateStatement(stmt.cases[i], bodyFlags));
                                result.push(fragment);
                                if (!endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                                    result.push(newline);
                                }
                            }
                        }
                        result.push(addIndent('}'));
                        return result;
                    },

                    SwitchCase: function SwitchCase(stmt, flags) {
                        var result,
                            fragment,
                            i,
                            iz,
                            bodyFlags,
                            that = this;
                        withIndent(function () {
                            if (stmt.test) {
                                result = [join('case', that.generateExpression(stmt.test, Precedence.Sequence, E_TTT)), ':'];
                            } else {
                                result = ['default:'];
                            }

                            i = 0;
                            iz = stmt.consequent.length;
                            if (iz && stmt.consequent[0].type === Syntax.BlockStatement) {
                                fragment = that.maybeBlock(stmt.consequent[0], S_TFFF);
                                result.push(fragment);
                                i = 1;
                            }

                            if (i !== iz && !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                                result.push(newline);
                            }

                            bodyFlags = S_TFFF;
                            for (; i < iz; ++i) {
                                if (i === iz - 1 && flags & F_SEMICOLON_OPT) {
                                    bodyFlags |= F_SEMICOLON_OPT;
                                }
                                fragment = addIndent(that.generateStatement(stmt.consequent[i], bodyFlags));
                                result.push(fragment);
                                if (i + 1 !== iz && !endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                                    result.push(newline);
                                }
                            }
                        });
                        return result;
                    },

                    IfStatement: function IfStatement(stmt, flags) {
                        var result,
                            bodyFlags,
                            semicolonOptional,
                            that = this;
                        withIndent(function () {
                            result = ['if' + space + '(', that.generateExpression(stmt.test, Precedence.Sequence, E_TTT), ')'];
                        });
                        semicolonOptional = flags & F_SEMICOLON_OPT;
                        bodyFlags = S_TFFF;
                        if (semicolonOptional) {
                            bodyFlags |= F_SEMICOLON_OPT;
                        }
                        if (stmt.alternate) {
                            result.push(this.maybeBlock(stmt.consequent, S_TFFF));
                            result = this.maybeBlockSuffix(stmt.consequent, result);
                            if (stmt.alternate.type === Syntax.IfStatement) {
                                result = join(result, ['else ', this.generateStatement(stmt.alternate, bodyFlags)]);
                            } else {
                                result = join(result, join('else', this.maybeBlock(stmt.alternate, bodyFlags)));
                            }
                        } else {
                            result.push(this.maybeBlock(stmt.consequent, bodyFlags));
                        }
                        return result;
                    },

                    ForStatement: function ForStatement(stmt, flags) {
                        var result,
                            that = this;
                        withIndent(function () {
                            result = ['for' + space + '('];
                            if (stmt.init) {
                                if (stmt.init.type === Syntax.VariableDeclaration) {
                                    result.push(that.generateStatement(stmt.init, S_FFFF));
                                } else {
                                    // F_ALLOW_IN becomes false.
                                    result.push(that.generateExpression(stmt.init, Precedence.Sequence, E_FTT));
                                    result.push(';');
                                }
                            } else {
                                result.push(';');
                            }

                            if (stmt.test) {
                                result.push(space);
                                result.push(that.generateExpression(stmt.test, Precedence.Sequence, E_TTT));
                                result.push(';');
                            } else {
                                result.push(';');
                            }

                            if (stmt.update) {
                                result.push(space);
                                result.push(that.generateExpression(stmt.update, Precedence.Sequence, E_TTT));
                                result.push(')');
                            } else {
                                result.push(')');
                            }
                        });

                        result.push(this.maybeBlock(stmt.body, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF));
                        return result;
                    },

                    ForInStatement: function ForInStatement(stmt, flags) {
                        return this.generateIterationForStatement('in', stmt, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF);
                    },

                    ForOfStatement: function ForOfStatement(stmt, flags) {
                        return this.generateIterationForStatement('of', stmt, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF);
                    },

                    LabeledStatement: function LabeledStatement(stmt, flags) {
                        return [stmt.label.name + ':', this.maybeBlock(stmt.body, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF)];
                    },

                    Program: function Program(stmt, flags) {
                        var result, fragment, i, iz, bodyFlags;
                        iz = stmt.body.length;
                        result = [safeConcatenation && iz > 0 ? '\n' : ''];
                        bodyFlags = S_TFTF;
                        for (i = 0; i < iz; ++i) {
                            if (!safeConcatenation && i === iz - 1) {
                                bodyFlags |= F_SEMICOLON_OPT;
                            }

                            if (preserveBlankLines) {
                                // handle spaces before the first line
                                if (i === 0) {
                                    if (!stmt.body[0].leadingComments) {
                                        generateBlankLines(stmt.range[0], stmt.body[i].range[0], result);
                                    }
                                }

                                // handle spaces between lines
                                if (i > 0) {
                                    if (!stmt.body[i - 1].trailingComments && !stmt.body[i].leadingComments) {
                                        generateBlankLines(stmt.body[i - 1].range[1], stmt.body[i].range[0], result);
                                    }
                                }
                            }

                            fragment = addIndent(this.generateStatement(stmt.body[i], bodyFlags));
                            result.push(fragment);
                            if (i + 1 < iz && !endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                                if (preserveBlankLines) {
                                    if (!stmt.body[i + 1].leadingComments) {
                                        result.push(newline);
                                    }
                                } else {
                                    result.push(newline);
                                }
                            }

                            if (preserveBlankLines) {
                                // handle spaces after the last line
                                if (i === iz - 1) {
                                    if (!stmt.body[i].trailingComments) {
                                        generateBlankLines(stmt.body[i].range[1], stmt.range[1], result);
                                    }
                                }
                            }
                        }
                        return result;
                    },

                    FunctionDeclaration: function FunctionDeclaration(stmt, flags) {
                        return [generateAsyncPrefix(stmt, true), 'function', generateStarSuffix(stmt) || noEmptySpace(), stmt.id ? generateIdentifier(stmt.id) : '', this.generateFunctionBody(stmt)];
                    },

                    ReturnStatement: function ReturnStatement(stmt, flags) {
                        if (stmt.argument) {
                            return [join('return', this.generateExpression(stmt.argument, Precedence.Sequence, E_TTT)), this.semicolon(flags)];
                        }
                        return ['return' + this.semicolon(flags)];
                    },

                    WhileStatement: function WhileStatement(stmt, flags) {
                        var result,
                            that = this;
                        withIndent(function () {
                            result = ['while' + space + '(', that.generateExpression(stmt.test, Precedence.Sequence, E_TTT), ')'];
                        });
                        result.push(this.maybeBlock(stmt.body, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF));
                        return result;
                    },

                    WithStatement: function WithStatement(stmt, flags) {
                        var result,
                            that = this;
                        withIndent(function () {
                            result = ['with' + space + '(', that.generateExpression(stmt.object, Precedence.Sequence, E_TTT), ')'];
                        });
                        result.push(this.maybeBlock(stmt.body, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF));
                        return result;
                    }

                };

                merge(CodeGenerator.prototype, CodeGenerator.Statement);

                // Expressions.

                CodeGenerator.Expression = {

                    SequenceExpression: function SequenceExpression(expr, precedence, flags) {
                        var result, i, iz;
                        if (Precedence.Sequence < precedence) {
                            flags |= F_ALLOW_IN;
                        }
                        result = [];
                        for (i = 0, iz = expr.expressions.length; i < iz; ++i) {
                            result.push(this.generateExpression(expr.expressions[i], Precedence.Assignment, flags));
                            if (i + 1 < iz) {
                                result.push(',' + space);
                            }
                        }
                        return parenthesize(result, Precedence.Sequence, precedence);
                    },

                    AssignmentExpression: function AssignmentExpression(expr, precedence, flags) {
                        return this.generateAssignment(expr.left, expr.right, expr.operator, precedence, flags);
                    },

                    ArrowFunctionExpression: function ArrowFunctionExpression(expr, precedence, flags) {
                        return parenthesize(this.generateFunctionBody(expr), Precedence.ArrowFunction, precedence);
                    },

                    ConditionalExpression: function ConditionalExpression(expr, precedence, flags) {
                        if (Precedence.Conditional < precedence) {
                            flags |= F_ALLOW_IN;
                        }
                        return parenthesize([this.generateExpression(expr.test, Precedence.LogicalOR, flags), space + '?' + space, this.generateExpression(expr.consequent, Precedence.Assignment, flags), space + ':' + space, this.generateExpression(expr.alternate, Precedence.Assignment, flags)], Precedence.Conditional, precedence);
                    },

                    LogicalExpression: function LogicalExpression(expr, precedence, flags) {
                        return this.BinaryExpression(expr, precedence, flags);
                    },

                    BinaryExpression: function BinaryExpression(expr, precedence, flags) {
                        var result, currentPrecedence, fragment, leftSource;
                        currentPrecedence = BinaryPrecedence[expr.operator];

                        if (currentPrecedence < precedence) {
                            flags |= F_ALLOW_IN;
                        }

                        fragment = this.generateExpression(expr.left, currentPrecedence, flags);

                        leftSource = fragment.toString();

                        if (leftSource.charCodeAt(leftSource.length - 1) === 0x2F /* / */ && esutils.code.isIdentifierPartES5(expr.operator.charCodeAt(0))) {
                            result = [fragment, noEmptySpace(), expr.operator];
                        } else {
                            result = join(fragment, expr.operator);
                        }

                        fragment = this.generateExpression(expr.right, currentPrecedence + 1, flags);

                        if (expr.operator === '/' && fragment.toString().charAt(0) === '/' || expr.operator.slice(-1) === '<' && fragment.toString().slice(0, 3) === '!--') {
                            // If '/' concats with '/' or `<` concats with `!--`, it is interpreted as comment start
                            result.push(noEmptySpace());
                            result.push(fragment);
                        } else {
                            result = join(result, fragment);
                        }

                        if (expr.operator === 'in' && !(flags & F_ALLOW_IN)) {
                            return ['(', result, ')'];
                        }
                        return parenthesize(result, currentPrecedence, precedence);
                    },

                    CallExpression: function CallExpression(expr, precedence, flags) {
                        var result, i, iz;
                        // F_ALLOW_UNPARATH_NEW becomes false.
                        result = [this.generateExpression(expr.callee, Precedence.Call, E_TTF)];
                        result.push('(');
                        for (i = 0, iz = expr['arguments'].length; i < iz; ++i) {
                            result.push(this.generateExpression(expr['arguments'][i], Precedence.Assignment, E_TTT));
                            if (i + 1 < iz) {
                                result.push(',' + space);
                            }
                        }
                        result.push(')');

                        if (!(flags & F_ALLOW_CALL)) {
                            return ['(', result, ')'];
                        }
                        return parenthesize(result, Precedence.Call, precedence);
                    },

                    NewExpression: function NewExpression(expr, precedence, flags) {
                        var result, length, i, iz, itemFlags;
                        length = expr['arguments'].length;

                        // F_ALLOW_CALL becomes false.
                        // F_ALLOW_UNPARATH_NEW may become false.
                        itemFlags = flags & F_ALLOW_UNPARATH_NEW && !parentheses && length === 0 ? E_TFT : E_TFF;

                        result = join('new', this.generateExpression(expr.callee, Precedence.New, itemFlags));

                        if (!(flags & F_ALLOW_UNPARATH_NEW) || parentheses || length > 0) {
                            result.push('(');
                            for (i = 0, iz = length; i < iz; ++i) {
                                result.push(this.generateExpression(expr['arguments'][i], Precedence.Assignment, E_TTT));
                                if (i + 1 < iz) {
                                    result.push(',' + space);
                                }
                            }
                            result.push(')');
                        }

                        return parenthesize(result, Precedence.New, precedence);
                    },

                    MemberExpression: function MemberExpression(expr, precedence, flags) {
                        var result, fragment;

                        // F_ALLOW_UNPARATH_NEW becomes false.
                        result = [this.generateExpression(expr.object, Precedence.Call, flags & F_ALLOW_CALL ? E_TTF : E_TFF)];

                        if (expr.computed) {
                            result.push('[');
                            result.push(this.generateExpression(expr.property, Precedence.Sequence, flags & F_ALLOW_CALL ? E_TTT : E_TFT));
                            result.push(']');
                        } else {
                            if (expr.object.type === Syntax.Literal && typeof expr.object.value === 'number') {
                                fragment = toSourceNodeWhenNeeded(result).toString();
                                // When the following conditions are all true,
                                //   1. No floating point
                                //   2. Don't have exponents
                                //   3. The last character is a decimal digit
                                //   4. Not hexadecimal OR octal number literal
                                // we should add a floating point.
                                if (fragment.indexOf('.') < 0 && !/[eExX]/.test(fragment) && esutils.code.isDecimalDigit(fragment.charCodeAt(fragment.length - 1)) && !(fragment.length >= 2 && fragment.charCodeAt(0) === 48) // '0'
                                ) {
                                        result.push(' ');
                                    }
                            }
                            result.push('.');
                            result.push(generateIdentifier(expr.property));
                        }

                        return parenthesize(result, Precedence.Member, precedence);
                    },

                    MetaProperty: function MetaProperty(expr, precedence, flags) {
                        var result;
                        result = [];
                        result.push(typeof expr.meta === "string" ? expr.meta : generateIdentifier(expr.meta));
                        result.push('.');
                        result.push(typeof expr.property === "string" ? expr.property : generateIdentifier(expr.property));
                        return parenthesize(result, Precedence.Member, precedence);
                    },

                    UnaryExpression: function UnaryExpression(expr, precedence, flags) {
                        var result, fragment, rightCharCode, leftSource, leftCharCode;
                        fragment = this.generateExpression(expr.argument, Precedence.Unary, E_TTT);

                        if (space === '') {
                            result = join(expr.operator, fragment);
                        } else {
                            result = [expr.operator];
                            if (expr.operator.length > 2) {
                                // delete, void, typeof
                                // get `typeof []`, not `typeof[]`
                                result = join(result, fragment);
                            } else {
                                // Prevent inserting spaces between operator and argument if it is unnecessary
                                // like, `!cond`
                                leftSource = toSourceNodeWhenNeeded(result).toString();
                                leftCharCode = leftSource.charCodeAt(leftSource.length - 1);
                                rightCharCode = fragment.toString().charCodeAt(0);

                                if ((leftCharCode === 0x2B /* + */ || leftCharCode === 0x2D /* - */) && leftCharCode === rightCharCode || esutils.code.isIdentifierPartES5(leftCharCode) && esutils.code.isIdentifierPartES5(rightCharCode)) {
                                    result.push(noEmptySpace());
                                    result.push(fragment);
                                } else {
                                    result.push(fragment);
                                }
                            }
                        }
                        return parenthesize(result, Precedence.Unary, precedence);
                    },

                    YieldExpression: function YieldExpression(expr, precedence, flags) {
                        var result;
                        if (expr.delegate) {
                            result = 'yield*';
                        } else {
                            result = 'yield';
                        }
                        if (expr.argument) {
                            result = join(result, this.generateExpression(expr.argument, Precedence.Yield, E_TTT));
                        }
                        return parenthesize(result, Precedence.Yield, precedence);
                    },

                    AwaitExpression: function AwaitExpression(expr, precedence, flags) {
                        var result = join(expr.all ? 'await*' : 'await', this.generateExpression(expr.argument, Precedence.Await, E_TTT));
                        return parenthesize(result, Precedence.Await, precedence);
                    },

                    UpdateExpression: function UpdateExpression(expr, precedence, flags) {
                        if (expr.prefix) {
                            return parenthesize([expr.operator, this.generateExpression(expr.argument, Precedence.Unary, E_TTT)], Precedence.Unary, precedence);
                        }
                        return parenthesize([this.generateExpression(expr.argument, Precedence.Postfix, E_TTT), expr.operator], Precedence.Postfix, precedence);
                    },

                    FunctionExpression: function FunctionExpression(expr, precedence, flags) {
                        var result = [generateAsyncPrefix(expr, true), 'function'];
                        if (expr.id) {
                            result.push(generateStarSuffix(expr) || noEmptySpace());
                            result.push(generateIdentifier(expr.id));
                        } else {
                            result.push(generateStarSuffix(expr) || space);
                        }
                        result.push(this.generateFunctionBody(expr));
                        return result;
                    },

                    ArrayPattern: function ArrayPattern(expr, precedence, flags) {
                        return this.ArrayExpression(expr, precedence, flags, true);
                    },

                    ArrayExpression: function ArrayExpression(expr, precedence, flags, isPattern) {
                        var result,
                            multiline,
                            that = this;
                        if (!expr.elements.length) {
                            return '[]';
                        }
                        multiline = isPattern ? false : expr.elements.length > 1;
                        result = ['[', multiline ? newline : ''];
                        withIndent(function (indent) {
                            var i, iz;
                            for (i = 0, iz = expr.elements.length; i < iz; ++i) {
                                if (!expr.elements[i]) {
                                    if (multiline) {
                                        result.push(indent);
                                    }
                                    if (i + 1 === iz) {
                                        result.push(',');
                                    }
                                } else {
                                    result.push(multiline ? indent : '');
                                    result.push(that.generateExpression(expr.elements[i], Precedence.Assignment, E_TTT));
                                }
                                if (i + 1 < iz) {
                                    result.push(',' + (multiline ? newline : space));
                                }
                            }
                        });
                        if (multiline && !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                            result.push(newline);
                        }
                        result.push(multiline ? base : '');
                        result.push(']');
                        return result;
                    },

                    RestElement: function RestElement(expr, precedence, flags) {
                        return '...' + this.generatePattern(expr.argument);
                    },

                    ClassExpression: function ClassExpression(expr, precedence, flags) {
                        var result, fragment;
                        result = ['class'];
                        if (expr.id) {
                            result = join(result, this.generateExpression(expr.id, Precedence.Sequence, E_TTT));
                        }
                        if (expr.superClass) {
                            fragment = join('extends', this.generateExpression(expr.superClass, Precedence.Assignment, E_TTT));
                            result = join(result, fragment);
                        }
                        result.push(space);
                        result.push(this.generateStatement(expr.body, S_TFFT));
                        return result;
                    },

                    MethodDefinition: function MethodDefinition(expr, precedence, flags) {
                        var result, fragment;
                        if (expr['static']) {
                            result = ['static' + space];
                        } else {
                            result = [];
                        }
                        if (expr.kind === 'get' || expr.kind === 'set') {
                            fragment = [join(expr.kind, this.generatePropertyKey(expr.key, expr.computed)), this.generateFunctionBody(expr.value)];
                        } else {
                            fragment = [generateMethodPrefix(expr), this.generatePropertyKey(expr.key, expr.computed), this.generateFunctionBody(expr.value)];
                        }
                        return join(result, fragment);
                    },

                    Property: function Property(expr, precedence, flags) {
                        if (expr.kind === 'get' || expr.kind === 'set') {
                            return [expr.kind, noEmptySpace(), this.generatePropertyKey(expr.key, expr.computed), this.generateFunctionBody(expr.value)];
                        }

                        if (expr.shorthand) {
                            if (expr.value.type === "AssignmentPattern") {
                                return this.AssignmentPattern(expr.value, Precedence.Sequence, E_TTT);
                            }
                            return this.generatePropertyKey(expr.key, expr.computed);
                        }

                        if (expr.method) {
                            return [generateMethodPrefix(expr), this.generatePropertyKey(expr.key, expr.computed), this.generateFunctionBody(expr.value)];
                        }

                        return [this.generatePropertyKey(expr.key, expr.computed), ':' + space, this.generateExpression(expr.value, Precedence.Assignment, E_TTT)];
                    },

                    ObjectExpression: function ObjectExpression(expr, precedence, flags) {
                        var multiline,
                            result,
                            fragment,
                            that = this;

                        if (!expr.properties.length) {
                            return '{}';
                        }
                        multiline = expr.properties.length > 1;

                        withIndent(function () {
                            fragment = that.generateExpression(expr.properties[0], Precedence.Sequence, E_TTT);
                        });

                        if (!multiline) {
                            // issues 4
                            // Do not transform from
                            //   dejavu.Class.declare({
                            //       method2: function () {}
                            //   });
                            // to
                            //   dejavu.Class.declare({method2: function () {
                            //       }});
                            if (!hasLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                                return ['{', space, fragment, space, '}'];
                            }
                        }

                        withIndent(function (indent) {
                            var i, iz;
                            result = ['{', newline, indent, fragment];

                            if (multiline) {
                                result.push(',' + newline);
                                for (i = 1, iz = expr.properties.length; i < iz; ++i) {
                                    result.push(indent);
                                    result.push(that.generateExpression(expr.properties[i], Precedence.Sequence, E_TTT));
                                    if (i + 1 < iz) {
                                        result.push(',' + newline);
                                    }
                                }
                            }
                        });

                        if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                            result.push(newline);
                        }
                        result.push(base);
                        result.push('}');
                        return result;
                    },

                    AssignmentPattern: function AssignmentPattern(expr, precedence, flags) {
                        return this.generateAssignment(expr.left, expr.right, '=', precedence, flags);
                    },

                    ObjectPattern: function ObjectPattern(expr, precedence, flags) {
                        var result,
                            i,
                            iz,
                            multiline,
                            property,
                            that = this;
                        if (!expr.properties.length) {
                            return '{}';
                        }

                        multiline = false;
                        if (expr.properties.length === 1) {
                            property = expr.properties[0];
                            if (property.value.type !== Syntax.Identifier) {
                                multiline = true;
                            }
                        } else {
                            for (i = 0, iz = expr.properties.length; i < iz; ++i) {
                                property = expr.properties[i];
                                if (!property.shorthand) {
                                    multiline = true;
                                    break;
                                }
                            }
                        }
                        result = ['{', multiline ? newline : ''];

                        withIndent(function (indent) {
                            var i, iz;
                            for (i = 0, iz = expr.properties.length; i < iz; ++i) {
                                result.push(multiline ? indent : '');
                                result.push(that.generateExpression(expr.properties[i], Precedence.Sequence, E_TTT));
                                if (i + 1 < iz) {
                                    result.push(',' + (multiline ? newline : space));
                                }
                            }
                        });

                        if (multiline && !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                            result.push(newline);
                        }
                        result.push(multiline ? base : '');
                        result.push('}');
                        return result;
                    },

                    ThisExpression: function ThisExpression(expr, precedence, flags) {
                        return 'this';
                    },

                    Super: function Super(expr, precedence, flags) {
                        return 'super';
                    },

                    Identifier: function Identifier(expr, precedence, flags) {
                        return generateIdentifier(expr);
                    },

                    ImportDefaultSpecifier: function ImportDefaultSpecifier(expr, precedence, flags) {
                        return generateIdentifier(expr.id || expr.local);
                    },

                    ImportNamespaceSpecifier: function ImportNamespaceSpecifier(expr, precedence, flags) {
                        var result = ['*'];
                        var id = expr.id || expr.local;
                        if (id) {
                            result.push(space + 'as' + noEmptySpace() + generateIdentifier(id));
                        }
                        return result;
                    },

                    ImportSpecifier: function ImportSpecifier(expr, precedence, flags) {
                        var imported = expr.imported;
                        var result = [imported.name];
                        var local = expr.local;
                        if (local && local.name !== imported.name) {
                            result.push(noEmptySpace() + 'as' + noEmptySpace() + generateIdentifier(local));
                        }
                        return result;
                    },

                    ExportSpecifier: function ExportSpecifier(expr, precedence, flags) {
                        var local = expr.local;
                        var result = [local.name];
                        var exported = expr.exported;
                        if (exported && exported.name !== local.name) {
                            result.push(noEmptySpace() + 'as' + noEmptySpace() + generateIdentifier(exported));
                        }
                        return result;
                    },

                    Literal: function Literal(expr, precedence, flags) {
                        var raw;
                        if (expr.hasOwnProperty('raw') && parse && extra.raw) {
                            try {
                                raw = parse(expr.raw).body[0].expression;
                                if (raw.type === Syntax.Literal) {
                                    if (raw.value === expr.value) {
                                        return expr.raw;
                                    }
                                }
                            } catch (e) {
                                // not use raw property
                            }
                        }

                        if (expr.value === null) {
                            return 'null';
                        }

                        if (typeof expr.value === 'string') {
                            return escapeString(expr.value);
                        }

                        if (typeof expr.value === 'number') {
                            return generateNumber(expr.value);
                        }

                        if (typeof expr.value === 'boolean') {
                            return expr.value ? 'true' : 'false';
                        }

                        if (expr.regex) {
                            return '/' + expr.regex.pattern + '/' + expr.regex.flags;
                        }
                        return generateRegExp(expr.value);
                    },

                    GeneratorExpression: function GeneratorExpression(expr, precedence, flags) {
                        return this.ComprehensionExpression(expr, precedence, flags);
                    },

                    ComprehensionExpression: function ComprehensionExpression(expr, precedence, flags) {
                        // GeneratorExpression should be parenthesized with (...), ComprehensionExpression with [...]
                        // Due to https://bugzilla.mozilla.org/show_bug.cgi?id=883468 position of expr.body can differ in Spidermonkey and ES6

                        var result,
                            i,
                            iz,
                            fragment,
                            that = this;
                        result = expr.type === Syntax.GeneratorExpression ? ['('] : ['['];

                        if (extra.moz.comprehensionExpressionStartsWithAssignment) {
                            fragment = this.generateExpression(expr.body, Precedence.Assignment, E_TTT);
                            result.push(fragment);
                        }

                        if (expr.blocks) {
                            withIndent(function () {
                                for (i = 0, iz = expr.blocks.length; i < iz; ++i) {
                                    fragment = that.generateExpression(expr.blocks[i], Precedence.Sequence, E_TTT);
                                    if (i > 0 || extra.moz.comprehensionExpressionStartsWithAssignment) {
                                        result = join(result, fragment);
                                    } else {
                                        result.push(fragment);
                                    }
                                }
                            });
                        }

                        if (expr.filter) {
                            result = join(result, 'if' + space);
                            fragment = this.generateExpression(expr.filter, Precedence.Sequence, E_TTT);
                            result = join(result, ['(', fragment, ')']);
                        }

                        if (!extra.moz.comprehensionExpressionStartsWithAssignment) {
                            fragment = this.generateExpression(expr.body, Precedence.Assignment, E_TTT);

                            result = join(result, fragment);
                        }

                        result.push(expr.type === Syntax.GeneratorExpression ? ')' : ']');
                        return result;
                    },

                    ComprehensionBlock: function ComprehensionBlock(expr, precedence, flags) {
                        var fragment;
                        if (expr.left.type === Syntax.VariableDeclaration) {
                            fragment = [expr.left.kind, noEmptySpace(), this.generateStatement(expr.left.declarations[0], S_FFFF)];
                        } else {
                            fragment = this.generateExpression(expr.left, Precedence.Call, E_TTT);
                        }

                        fragment = join(fragment, expr.of ? 'of' : 'in');
                        fragment = join(fragment, this.generateExpression(expr.right, Precedence.Sequence, E_TTT));

                        return ['for' + space + '(', fragment, ')'];
                    },

                    SpreadElement: function SpreadElement(expr, precedence, flags) {
                        return ['...', this.generateExpression(expr.argument, Precedence.Assignment, E_TTT)];
                    },

                    TaggedTemplateExpression: function TaggedTemplateExpression(expr, precedence, flags) {
                        var itemFlags = E_TTF;
                        if (!(flags & F_ALLOW_CALL)) {
                            itemFlags = E_TFF;
                        }
                        var result = [this.generateExpression(expr.tag, Precedence.Call, itemFlags), this.generateExpression(expr.quasi, Precedence.Primary, E_FFT)];
                        return parenthesize(result, Precedence.TaggedTemplate, precedence);
                    },

                    TemplateElement: function TemplateElement(expr, precedence, flags) {
                        // Don't use "cooked". Since tagged template can use raw template
                        // representation. So if we do so, it breaks the script semantics.
                        return expr.value.raw;
                    },

                    TemplateLiteral: function TemplateLiteral(expr, precedence, flags) {
                        var result, i, iz;
                        result = ['`'];
                        for (i = 0, iz = expr.quasis.length; i < iz; ++i) {
                            result.push(this.generateExpression(expr.quasis[i], Precedence.Primary, E_TTT));
                            if (i + 1 < iz) {
                                result.push('${' + space);
                                result.push(this.generateExpression(expr.expressions[i], Precedence.Sequence, E_TTT));
                                result.push(space + '}');
                            }
                        }
                        result.push('`');
                        return result;
                    },

                    ModuleSpecifier: function ModuleSpecifier(expr, precedence, flags) {
                        return this.Literal(expr, precedence, flags);
                    }

                };

                merge(CodeGenerator.prototype, CodeGenerator.Expression);

                CodeGenerator.prototype.generateExpression = function (expr, precedence, flags) {
                    var result, type;

                    type = expr.type || Syntax.Property;

                    if (extra.verbatim && expr.hasOwnProperty(extra.verbatim)) {
                        return generateVerbatim(expr, precedence);
                    }

                    result = this[type](expr, precedence, flags);

                    if (extra.comment) {
                        result = addComments(expr, result);
                    }
                    return toSourceNodeWhenNeeded(result, expr);
                };

                CodeGenerator.prototype.generateStatement = function (stmt, flags) {
                    var result, fragment;

                    result = this[stmt.type](stmt, flags);

                    // Attach comments

                    if (extra.comment) {
                        result = addComments(stmt, result);
                    }

                    fragment = toSourceNodeWhenNeeded(result).toString();
                    if (stmt.type === Syntax.Program && !safeConcatenation && newline === '' && fragment.charAt(fragment.length - 1) === '\n') {
                        result = sourceMap ? toSourceNodeWhenNeeded(result).replaceRight(/\s+$/, '') : fragment.replace(/\s+$/, '');
                    }

                    return toSourceNodeWhenNeeded(result, stmt);
                };

                function generateInternal(node) {
                    var codegen;

                    codegen = new CodeGenerator();
                    if (isStatement(node)) {
                        return codegen.generateStatement(node, S_TFFF);
                    }

                    if (isExpression(node)) {
                        return codegen.generateExpression(node, Precedence.Sequence, E_TTT);
                    }

                    throw new Error('Unknown node type: ' + node.type);
                }

                function generate(node, options) {
                    var defaultOptions = getDefaultOptions(),
                        result,
                        pair;

                    if (options != null) {
                        // Obsolete options
                        //
                        //   `options.indent`
                        //   `options.base`
                        //
                        // Instead of them, we can use `option.format.indent`.
                        if (typeof options.indent === 'string') {
                            defaultOptions.format.indent.style = options.indent;
                        }
                        if (typeof options.base === 'number') {
                            defaultOptions.format.indent.base = options.base;
                        }
                        options = updateDeeply(defaultOptions, options);
                        indent = options.format.indent.style;
                        if (typeof options.base === 'string') {
                            base = options.base;
                        } else {
                            base = stringRepeat(indent, options.format.indent.base);
                        }
                    } else {
                        options = defaultOptions;
                        indent = options.format.indent.style;
                        base = stringRepeat(indent, options.format.indent.base);
                    }
                    json = options.format.json;
                    renumber = options.format.renumber;
                    hexadecimal = json ? false : options.format.hexadecimal;
                    quotes = json ? 'double' : options.format.quotes;
                    escapeless = options.format.escapeless;
                    newline = options.format.newline;
                    space = options.format.space;
                    if (options.format.compact) {
                        newline = space = indent = base = '';
                    }
                    parentheses = options.format.parentheses;
                    semicolons = options.format.semicolons;
                    safeConcatenation = options.format.safeConcatenation;
                    directive = options.directive;
                    parse = json ? null : options.parse;
                    sourceMap = options.sourceMap;
                    sourceCode = options.sourceCode;
                    preserveBlankLines = options.format.preserveBlankLines && sourceCode !== null;
                    extra = options;

                    if (sourceMap) {
                        if (!exports.browser) {
                            // We assume environment is node.js
                            // And prevent from including source-map by browserify
                            SourceNode = require('source-map').SourceNode;
                        } else {
                            SourceNode = global.sourceMap.SourceNode;
                        }
                    }

                    result = generateInternal(node);

                    if (!sourceMap) {
                        pair = { code: result.toString(), map: null };
                        return options.sourceMapWithCode ? pair : pair.code;
                    }

                    pair = result.toStringWithSourceMap({
                        file: options.file,
                        sourceRoot: options.sourceMapRoot
                    });

                    if (options.sourceContent) {
                        pair.map.setSourceContent(options.sourceMap, options.sourceContent);
                    }

                    if (options.sourceMapWithCode) {
                        return pair;
                    }

                    return pair.map.toString();
                }

                FORMAT_MINIFY = {
                    indent: {
                        style: '',
                        base: 0
                    },
                    renumber: true,
                    hexadecimal: true,
                    quotes: 'auto',
                    escapeless: true,
                    compact: true,
                    parentheses: false,
                    semicolons: false
                };

                FORMAT_DEFAULTS = getDefaultOptions().format;

                exports.version = require('./package.json').version;
                exports.generate = generate;
                exports.attachComments = estraverse.attachComments;
                exports.Precedence = updateDeeply({}, Precedence);
                exports.browser = false;
                exports.FORMAT_MINIFY = FORMAT_MINIFY;
                exports.FORMAT_DEFAULTS = FORMAT_DEFAULTS;
            })();
            /* vim: set sw=4 ts=4 et tw=80 : */
        }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, { "./package.json": 13, "estraverse": 14, "esutils": 19, "source-map": 12 }], 2: [function (require, module, exports) {
        /* -*- Mode: js; js-indent-level: 2; -*- */
        /*
         * Copyright 2011 Mozilla Foundation and contributors
         * Licensed under the New BSD license. See LICENSE or:
         * http://opensource.org/licenses/BSD-3-Clause
         */

        var util = require('./util');
        var has = Object.prototype.hasOwnProperty;
        var hasNativeMap = typeof Map !== "undefined";

        /**
         * A data structure which is a combination of an array and a set. Adding a new
         * member is O(1), testing for membership is O(1), and finding the index of an
         * element is O(1). Removing elements from the set is not supported. Only
         * strings are supported for membership.
         */
        function ArraySet() {
            this._array = [];
            this._set = hasNativeMap ? new Map() : Object.create(null);
        }

        /**
         * Static method for creating ArraySet instances from an existing array.
         */
        ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
            var set = new ArraySet();
            for (var i = 0, len = aArray.length; i < len; i++) {
                set.add(aArray[i], aAllowDuplicates);
            }
            return set;
        };

        /**
         * Return how many unique items are in this ArraySet. If duplicates have been
         * added, than those do not count towards the size.
         *
         * @returns Number
         */
        ArraySet.prototype.size = function ArraySet_size() {
            return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
        };

        /**
         * Add the given string to this set.
         *
         * @param String aStr
         */
        ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
            var sStr = hasNativeMap ? aStr : util.toSetString(aStr);
            var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
            var idx = this._array.length;
            if (!isDuplicate || aAllowDuplicates) {
                this._array.push(aStr);
            }
            if (!isDuplicate) {
                if (hasNativeMap) {
                    this._set.set(aStr, idx);
                } else {
                    this._set[sStr] = idx;
                }
            }
        };

        /**
         * Is the given string a member of this set?
         *
         * @param String aStr
         */
        ArraySet.prototype.has = function ArraySet_has(aStr) {
            if (hasNativeMap) {
                return this._set.has(aStr);
            } else {
                var sStr = util.toSetString(aStr);
                return has.call(this._set, sStr);
            }
        };

        /**
         * What is the index of the given string in the array?
         *
         * @param String aStr
         */
        ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
            if (hasNativeMap) {
                var idx = this._set.get(aStr);
                if (idx >= 0) {
                    return idx;
                }
            } else {
                var sStr = util.toSetString(aStr);
                if (has.call(this._set, sStr)) {
                    return this._set[sStr];
                }
            }

            throw new Error('"' + aStr + '" is not in the set.');
        };

        /**
         * What is the element at the given index?
         *
         * @param Number aIdx
         */
        ArraySet.prototype.at = function ArraySet_at(aIdx) {
            if (aIdx >= 0 && aIdx < this._array.length) {
                return this._array[aIdx];
            }
            throw new Error('No element indexed by ' + aIdx);
        };

        /**
         * Returns the array representation of this set (which has the proper indices
         * indicated by indexOf). Note that this is a copy of the internal array used
         * for storing the members so that no one can mess with internal state.
         */
        ArraySet.prototype.toArray = function ArraySet_toArray() {
            return this._array.slice();
        };

        exports.ArraySet = ArraySet;
    }, { "./util": 11 }], 3: [function (require, module, exports) {
        /* -*- Mode: js; js-indent-level: 2; -*- */
        /*
         * Copyright 2011 Mozilla Foundation and contributors
         * Licensed under the New BSD license. See LICENSE or:
         * http://opensource.org/licenses/BSD-3-Clause
         *
         * Based on the Base 64 VLQ implementation in Closure Compiler:
         * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
         *
         * Copyright 2011 The Closure Compiler Authors. All rights reserved.
         * Redistribution and use in source and binary forms, with or without
         * modification, are permitted provided that the following conditions are
         * met:
         *
         *  * Redistributions of source code must retain the above copyright
         *    notice, this list of conditions and the following disclaimer.
         *  * Redistributions in binary form must reproduce the above
         *    copyright notice, this list of conditions and the following
         *    disclaimer in the documentation and/or other materials provided
         *    with the distribution.
         *  * Neither the name of Google Inc. nor the names of its
         *    contributors may be used to endorse or promote products derived
         *    from this software without specific prior written permission.
         *
         * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
         * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
         * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
         * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
         * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
         * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
         * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
         * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
         * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
         * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
         * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
         */

        var base64 = require('./base64');

        // A single base 64 digit can contain 6 bits of data. For the base 64 variable
        // length quantities we use in the source map spec, the first bit is the sign,
        // the next four bits are the actual value, and the 6th bit is the
        // continuation bit. The continuation bit tells us whether there are more
        // digits in this value following this digit.
        //
        //   Continuation
        //   |    Sign
        //   |    |
        //   V    V
        //   101011

        var VLQ_BASE_SHIFT = 5;

        // binary: 100000
        var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

        // binary: 011111
        var VLQ_BASE_MASK = VLQ_BASE - 1;

        // binary: 100000
        var VLQ_CONTINUATION_BIT = VLQ_BASE;

        /**
         * Converts from a two-complement value to a value where the sign bit is
         * placed in the least significant bit.  For example, as decimals:
         *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
         *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
         */
        function toVLQSigned(aValue) {
            return aValue < 0 ? (-aValue << 1) + 1 : (aValue << 1) + 0;
        }

        /**
         * Converts to a two-complement value from a value where the sign bit is
         * placed in the least significant bit.  For example, as decimals:
         *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
         *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
         */
        function fromVLQSigned(aValue) {
            var isNegative = (aValue & 1) === 1;
            var shifted = aValue >> 1;
            return isNegative ? -shifted : shifted;
        }

        /**
         * Returns the base 64 VLQ encoded value.
         */
        exports.encode = function base64VLQ_encode(aValue) {
            var encoded = "";
            var digit;

            var vlq = toVLQSigned(aValue);

            do {
                digit = vlq & VLQ_BASE_MASK;
                vlq >>>= VLQ_BASE_SHIFT;
                if (vlq > 0) {
                    // There are still more digits in this value, so we must make sure the
                    // continuation bit is marked.
                    digit |= VLQ_CONTINUATION_BIT;
                }
                encoded += base64.encode(digit);
            } while (vlq > 0);

            return encoded;
        };

        /**
         * Decodes the next base 64 VLQ value from the given string and returns the
         * value and the rest of the string via the out parameter.
         */
        exports.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
            var strLen = aStr.length;
            var result = 0;
            var shift = 0;
            var continuation, digit;

            do {
                if (aIndex >= strLen) {
                    throw new Error("Expected more digits in base 64 VLQ value.");
                }

                digit = base64.decode(aStr.charCodeAt(aIndex++));
                if (digit === -1) {
                    throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
                }

                continuation = !!(digit & VLQ_CONTINUATION_BIT);
                digit &= VLQ_BASE_MASK;
                result = result + (digit << shift);
                shift += VLQ_BASE_SHIFT;
            } while (continuation);

            aOutParam.value = fromVLQSigned(result);
            aOutParam.rest = aIndex;
        };
    }, { "./base64": 4 }], 4: [function (require, module, exports) {
        /* -*- Mode: js; js-indent-level: 2; -*- */
        /*
         * Copyright 2011 Mozilla Foundation and contributors
         * Licensed under the New BSD license. See LICENSE or:
         * http://opensource.org/licenses/BSD-3-Clause
         */

        var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

        /**
         * Encode an integer in the range of 0 to 63 to a single base 64 digit.
         */
        exports.encode = function (number) {
            if (0 <= number && number < intToCharMap.length) {
                return intToCharMap[number];
            }
            throw new TypeError("Must be between 0 and 63: " + number);
        };

        /**
         * Decode a single base 64 character code digit to an integer. Returns -1 on
         * failure.
         */
        exports.decode = function (charCode) {
            var bigA = 65; // 'A'
            var bigZ = 90; // 'Z'

            var littleA = 97; // 'a'
            var littleZ = 122; // 'z'

            var zero = 48; // '0'
            var nine = 57; // '9'

            var plus = 43; // '+'
            var slash = 47; // '/'

            var littleOffset = 26;
            var numberOffset = 52;

            // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
            if (bigA <= charCode && charCode <= bigZ) {
                return charCode - bigA;
            }

            // 26 - 51: abcdefghijklmnopqrstuvwxyz
            if (littleA <= charCode && charCode <= littleZ) {
                return charCode - littleA + littleOffset;
            }

            // 52 - 61: 0123456789
            if (zero <= charCode && charCode <= nine) {
                return charCode - zero + numberOffset;
            }

            // 62: +
            if (charCode == plus) {
                return 62;
            }

            // 63: /
            if (charCode == slash) {
                return 63;
            }

            // Invalid base64 digit.
            return -1;
        };
    }, {}], 5: [function (require, module, exports) {
        /* -*- Mode: js; js-indent-level: 2; -*- */
        /*
         * Copyright 2011 Mozilla Foundation and contributors
         * Licensed under the New BSD license. See LICENSE or:
         * http://opensource.org/licenses/BSD-3-Clause
         */

        exports.GREATEST_LOWER_BOUND = 1;
        exports.LEAST_UPPER_BOUND = 2;

        /**
         * Recursive implementation of binary search.
         *
         * @param aLow Indices here and lower do not contain the needle.
         * @param aHigh Indices here and higher do not contain the needle.
         * @param aNeedle The element being searched for.
         * @param aHaystack The non-empty array being searched.
         * @param aCompare Function which takes two elements and returns -1, 0, or 1.
         * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
         *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
         *     closest element that is smaller than or greater than the one we are
         *     searching for, respectively, if the exact element cannot be found.
         */
        function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
            // This function terminates when one of the following is true:
            //
            //   1. We find the exact element we are looking for.
            //
            //   2. We did not find the exact element, but we can return the index of
            //      the next-closest element.
            //
            //   3. We did not find the exact element, and there is no next-closest
            //      element than the one we are searching for, so we return -1.
            var mid = Math.floor((aHigh - aLow) / 2) + aLow;
            var cmp = aCompare(aNeedle, aHaystack[mid], true);
            if (cmp === 0) {
                // Found the element we are looking for.
                return mid;
            } else if (cmp > 0) {
                // Our needle is greater than aHaystack[mid].
                if (aHigh - mid > 1) {
                    // The element is in the upper half.
                    return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
                }

                // The exact needle element was not found in this haystack. Determine if
                // we are in termination case (3) or (2) and return the appropriate thing.
                if (aBias == exports.LEAST_UPPER_BOUND) {
                    return aHigh < aHaystack.length ? aHigh : -1;
                } else {
                    return mid;
                }
            } else {
                // Our needle is less than aHaystack[mid].
                if (mid - aLow > 1) {
                    // The element is in the lower half.
                    return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
                }

                // we are in termination case (3) or (2) and return the appropriate thing.
                if (aBias == exports.LEAST_UPPER_BOUND) {
                    return mid;
                } else {
                    return aLow < 0 ? -1 : aLow;
                }
            }
        }

        /**
         * This is an implementation of binary search which will always try and return
         * the index of the closest element if there is no exact hit. This is because
         * mappings between original and generated line/col pairs are single points,
         * and there is an implicit region between each of them, so a miss just means
         * that you aren't on the very start of a region.
         *
         * @param aNeedle The element you are looking for.
         * @param aHaystack The array that is being searched.
         * @param aCompare A function which takes the needle and an element in the
         *     array and returns -1, 0, or 1 depending on whether the needle is less
         *     than, equal to, or greater than the element, respectively.
         * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
         *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
         *     closest element that is smaller than or greater than the one we are
         *     searching for, respectively, if the exact element cannot be found.
         *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
         */
        exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
            if (aHaystack.length === 0) {
                return -1;
            }

            var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack, aCompare, aBias || exports.GREATEST_LOWER_BOUND);
            if (index < 0) {
                return -1;
            }

            // We have found either the exact element, or the next-closest element than
            // the one we are searching for. However, there may be more than one such
            // element. Make sure we always return the smallest of these.
            while (index - 1 >= 0) {
                if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
                    break;
                }
                --index;
            }

            return index;
        };
    }, {}], 6: [function (require, module, exports) {
        /* -*- Mode: js; js-indent-level: 2; -*- */
        /*
         * Copyright 2014 Mozilla Foundation and contributors
         * Licensed under the New BSD license. See LICENSE or:
         * http://opensource.org/licenses/BSD-3-Clause
         */

        var util = require('./util');

        /**
         * Determine whether mappingB is after mappingA with respect to generated
         * position.
         */
        function generatedPositionAfter(mappingA, mappingB) {
            // Optimized for most common case
            var lineA = mappingA.generatedLine;
            var lineB = mappingB.generatedLine;
            var columnA = mappingA.generatedColumn;
            var columnB = mappingB.generatedColumn;
            return lineB > lineA || lineB == lineA && columnB >= columnA || util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
        }

        /**
         * A data structure to provide a sorted view of accumulated mappings in a
         * performance conscious manner. It trades a neglibable overhead in general
         * case for a large speedup in case of mappings being added in order.
         */
        function MappingList() {
            this._array = [];
            this._sorted = true;
            // Serves as infimum
            this._last = { generatedLine: -1, generatedColumn: 0 };
        }

        /**
         * Iterate through internal items. This method takes the same arguments that
         * `Array.prototype.forEach` takes.
         *
         * NOTE: The order of the mappings is NOT guaranteed.
         */
        MappingList.prototype.unsortedForEach = function MappingList_forEach(aCallback, aThisArg) {
            this._array.forEach(aCallback, aThisArg);
        };

        /**
         * Add the given source mapping.
         *
         * @param Object aMapping
         */
        MappingList.prototype.add = function MappingList_add(aMapping) {
            if (generatedPositionAfter(this._last, aMapping)) {
                this._last = aMapping;
                this._array.push(aMapping);
            } else {
                this._sorted = false;
                this._array.push(aMapping);
            }
        };

        /**
         * Returns the flat, sorted array of mappings. The mappings are sorted by
         * generated position.
         *
         * WARNING: This method returns internal data without copying, for
         * performance. The return value must NOT be mutated, and should be treated as
         * an immutable borrow. If you want to take ownership, you must make your own
         * copy.
         */
        MappingList.prototype.toArray = function MappingList_toArray() {
            if (!this._sorted) {
                this._array.sort(util.compareByGeneratedPositionsInflated);
                this._sorted = true;
            }
            return this._array;
        };

        exports.MappingList = MappingList;
    }, { "./util": 11 }], 7: [function (require, module, exports) {
        /* -*- Mode: js; js-indent-level: 2; -*- */
        /*
         * Copyright 2011 Mozilla Foundation and contributors
         * Licensed under the New BSD license. See LICENSE or:
         * http://opensource.org/licenses/BSD-3-Clause
         */

        // It turns out that some (most?) JavaScript engines don't self-host
        // `Array.prototype.sort`. This makes sense because C++ will likely remain
        // faster than JS when doing raw CPU-intensive sorting. However, when using a
        // custom comparator function, calling back and forth between the VM's C++ and
        // JIT'd JS is rather slow *and* loses JIT type information, resulting in
        // worse generated code for the comparator function than would be optimal. In
        // fact, when sorting with a comparator, these costs outweigh the benefits of
        // sorting in C++. By using our own JS-implemented Quick Sort (below), we get
        // a ~3500ms mean speed-up in `bench/bench.html`.

        /**
         * Swap the elements indexed by `x` and `y` in the array `ary`.
         *
         * @param {Array} ary
         *        The array.
         * @param {Number} x
         *        The index of the first item.
         * @param {Number} y
         *        The index of the second item.
         */
        function swap(ary, x, y) {
            var temp = ary[x];
            ary[x] = ary[y];
            ary[y] = temp;
        }

        /**
         * Returns a random integer within the range `low .. high` inclusive.
         *
         * @param {Number} low
         *        The lower bound on the range.
         * @param {Number} high
         *        The upper bound on the range.
         */
        function randomIntInRange(low, high) {
            return Math.round(low + Math.random() * (high - low));
        }

        /**
         * The Quick Sort algorithm.
         *
         * @param {Array} ary
         *        An array to sort.
         * @param {function} comparator
         *        Function to use to compare two items.
         * @param {Number} p
         *        Start index of the array
         * @param {Number} r
         *        End index of the array
         */
        function doQuickSort(ary, comparator, p, r) {
            // If our lower bound is less than our upper bound, we (1) partition the
            // array into two pieces and (2) recurse on each half. If it is not, this is
            // the empty array and our base case.

            if (p < r) {
                // (1) Partitioning.
                //
                // The partitioning chooses a pivot between `p` and `r` and moves all
                // elements that are less than or equal to the pivot to the before it, and
                // all the elements that are greater than it after it. The effect is that
                // once partition is done, the pivot is in the exact place it will be when
                // the array is put in sorted order, and it will not need to be moved
                // again. This runs in O(n) time.

                // Always choose a random pivot so that an input array which is reverse
                // sorted does not cause O(n^2) running time.
                var pivotIndex = randomIntInRange(p, r);
                var i = p - 1;

                swap(ary, pivotIndex, r);
                var pivot = ary[r];

                // Immediately after `j` is incremented in this loop, the following hold
                // true:
                //
                //   * Every element in `ary[p .. i]` is less than or equal to the pivot.
                //
                //   * Every element in `ary[i+1 .. j-1]` is greater than the pivot.
                for (var j = p; j < r; j++) {
                    if (comparator(ary[j], pivot) <= 0) {
                        i += 1;
                        swap(ary, i, j);
                    }
                }

                swap(ary, i + 1, j);
                var q = i + 1;

                // (2) Recurse on each half.

                doQuickSort(ary, comparator, p, q - 1);
                doQuickSort(ary, comparator, q + 1, r);
            }
        }

        /**
         * Sort the given array in-place with the given comparator function.
         *
         * @param {Array} ary
         *        An array to sort.
         * @param {function} comparator
         *        Function to use to compare two items.
         */
        exports.quickSort = function (ary, comparator) {
            doQuickSort(ary, comparator, 0, ary.length - 1);
        };
    }, {}], 8: [function (require, module, exports) {
        /* -*- Mode: js; js-indent-level: 2; -*- */
        /*
         * Copyright 2011 Mozilla Foundation and contributors
         * Licensed under the New BSD license. See LICENSE or:
         * http://opensource.org/licenses/BSD-3-Clause
         */

        var util = require('./util');
        var binarySearch = require('./binary-search');
        var ArraySet = require('./array-set').ArraySet;
        var base64VLQ = require('./base64-vlq');
        var quickSort = require('./quick-sort').quickSort;

        function SourceMapConsumer(aSourceMap, aSourceMapURL) {
            var sourceMap = aSourceMap;
            if (typeof aSourceMap === 'string') {
                sourceMap = util.parseSourceMapInput(aSourceMap);
            }

            return sourceMap.sections != null ? new IndexedSourceMapConsumer(sourceMap, aSourceMapURL) : new BasicSourceMapConsumer(sourceMap, aSourceMapURL);
        }

        SourceMapConsumer.fromSourceMap = function (aSourceMap, aSourceMapURL) {
            return BasicSourceMapConsumer.fromSourceMap(aSourceMap, aSourceMapURL);
        };

        /**
         * The version of the source mapping spec that we are consuming.
         */
        SourceMapConsumer.prototype._version = 3;

        // `__generatedMappings` and `__originalMappings` are arrays that hold the
        // parsed mapping coordinates from the source map's "mappings" attribute. They
        // are lazily instantiated, accessed via the `_generatedMappings` and
        // `_originalMappings` getters respectively, and we only parse the mappings
        // and create these arrays once queried for a source location. We jump through
        // these hoops because there can be many thousands of mappings, and parsing
        // them is expensive, so we only want to do it if we must.
        //
        // Each object in the arrays is of the form:
        //
        //     {
        //       generatedLine: The line number in the generated code,
        //       generatedColumn: The column number in the generated code,
        //       source: The path to the original source file that generated this
        //               chunk of code,
        //       originalLine: The line number in the original source that
        //                     corresponds to this chunk of generated code,
        //       originalColumn: The column number in the original source that
        //                       corresponds to this chunk of generated code,
        //       name: The name of the original symbol which generated this chunk of
        //             code.
        //     }
        //
        // All properties except for `generatedLine` and `generatedColumn` can be
        // `null`.
        //
        // `_generatedMappings` is ordered by the generated positions.
        //
        // `_originalMappings` is ordered by the original positions.

        SourceMapConsumer.prototype.__generatedMappings = null;
        Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
            configurable: true,
            enumerable: true,
            get: function get() {
                if (!this.__generatedMappings) {
                    this._parseMappings(this._mappings, this.sourceRoot);
                }

                return this.__generatedMappings;
            }
        });

        SourceMapConsumer.prototype.__originalMappings = null;
        Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
            configurable: true,
            enumerable: true,
            get: function get() {
                if (!this.__originalMappings) {
                    this._parseMappings(this._mappings, this.sourceRoot);
                }

                return this.__originalMappings;
            }
        });

        SourceMapConsumer.prototype._charIsMappingSeparator = function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
            var c = aStr.charAt(index);
            return c === ";" || c === ",";
        };

        /**
         * Parse the mappings in a string in to a data structure which we can easily
         * query (the ordered arrays in the `this.__generatedMappings` and
         * `this.__originalMappings` properties).
         */
        SourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
            throw new Error("Subclasses must implement _parseMappings");
        };

        SourceMapConsumer.GENERATED_ORDER = 1;
        SourceMapConsumer.ORIGINAL_ORDER = 2;

        SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
        SourceMapConsumer.LEAST_UPPER_BOUND = 2;

        /**
         * Iterate over each mapping between an original source/line/column and a
         * generated line/column in this source map.
         *
         * @param Function aCallback
         *        The function that is called with each mapping.
         * @param Object aContext
         *        Optional. If specified, this object will be the value of `this` every
         *        time that `aCallback` is called.
         * @param aOrder
         *        Either `SourceMapConsumer.GENERATED_ORDER` or
         *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
         *        iterate over the mappings sorted by the generated file's line/column
         *        order or the original's source/line/column order, respectively. Defaults to
         *        `SourceMapConsumer.GENERATED_ORDER`.
         */
        SourceMapConsumer.prototype.eachMapping = function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
            var context = aContext || null;
            var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

            var mappings;
            switch (order) {
                case SourceMapConsumer.GENERATED_ORDER:
                    mappings = this._generatedMappings;
                    break;
                case SourceMapConsumer.ORIGINAL_ORDER:
                    mappings = this._originalMappings;
                    break;
                default:
                    throw new Error("Unknown order of iteration.");
            }

            var sourceRoot = this.sourceRoot;
            mappings.map(function (mapping) {
                var source = mapping.source === null ? null : this._sources.at(mapping.source);
                source = util.computeSourceURL(sourceRoot, source, this._sourceMapURL);
                return {
                    source: source,
                    generatedLine: mapping.generatedLine,
                    generatedColumn: mapping.generatedColumn,
                    originalLine: mapping.originalLine,
                    originalColumn: mapping.originalColumn,
                    name: mapping.name === null ? null : this._names.at(mapping.name)
                };
            }, this).forEach(aCallback, context);
        };

        /**
         * Returns all generated line and column information for the original source,
         * line, and column provided. If no column is provided, returns all mappings
         * corresponding to a either the line we are searching for or the next
         * closest line that has any mappings. Otherwise, returns all mappings
         * corresponding to the given line and either the column we are searching for
         * or the next closest column that has any offsets.
         *
         * The only argument is an object with the following properties:
         *
         *   - source: The filename of the original source.
         *   - line: The line number in the original source.  The line number is 1-based.
         *   - column: Optional. the column number in the original source.
         *    The column number is 0-based.
         *
         * and an array of objects is returned, each with the following properties:
         *
         *   - line: The line number in the generated source, or null.  The
         *    line number is 1-based.
         *   - column: The column number in the generated source, or null.
         *    The column number is 0-based.
         */
        SourceMapConsumer.prototype.allGeneratedPositionsFor = function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
            var line = util.getArg(aArgs, 'line');

            // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
            // returns the index of the closest mapping less than the needle. By
            // setting needle.originalColumn to 0, we thus find the last mapping for
            // the given line, provided such a mapping exists.
            var needle = {
                source: util.getArg(aArgs, 'source'),
                originalLine: line,
                originalColumn: util.getArg(aArgs, 'column', 0)
            };

            needle.source = this._findSourceIndex(needle.source);
            if (needle.source < 0) {
                return [];
            }

            var mappings = [];

            var index = this._findMapping(needle, this._originalMappings, "originalLine", "originalColumn", util.compareByOriginalPositions, binarySearch.LEAST_UPPER_BOUND);
            if (index >= 0) {
                var mapping = this._originalMappings[index];

                if (aArgs.column === undefined) {
                    var originalLine = mapping.originalLine;

                    // Iterate until either we run out of mappings, or we run into
                    // a mapping for a different line than the one we found. Since
                    // mappings are sorted, this is guaranteed to find all mappings for
                    // the line we found.
                    while (mapping && mapping.originalLine === originalLine) {
                        mappings.push({
                            line: util.getArg(mapping, 'generatedLine', null),
                            column: util.getArg(mapping, 'generatedColumn', null),
                            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
                        });

                        mapping = this._originalMappings[++index];
                    }
                } else {
                    var originalColumn = mapping.originalColumn;

                    // Iterate until either we run out of mappings, or we run into
                    // a mapping for a different line than the one we were searching for.
                    // Since mappings are sorted, this is guaranteed to find all mappings for
                    // the line we are searching for.
                    while (mapping && mapping.originalLine === line && mapping.originalColumn == originalColumn) {
                        mappings.push({
                            line: util.getArg(mapping, 'generatedLine', null),
                            column: util.getArg(mapping, 'generatedColumn', null),
                            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
                        });

                        mapping = this._originalMappings[++index];
                    }
                }
            }

            return mappings;
        };

        exports.SourceMapConsumer = SourceMapConsumer;

        /**
         * A BasicSourceMapConsumer instance represents a parsed source map which we can
         * query for information about the original file positions by giving it a file
         * position in the generated source.
         *
         * The first parameter is the raw source map (either as a JSON string, or
         * already parsed to an object). According to the spec, source maps have the
         * following attributes:
         *
         *   - version: Which version of the source map spec this map is following.
         *   - sources: An array of URLs to the original source files.
         *   - names: An array of identifiers which can be referrenced by individual mappings.
         *   - sourceRoot: Optional. The URL root from which all sources are relative.
         *   - sourcesContent: Optional. An array of contents of the original source files.
         *   - mappings: A string of base64 VLQs which contain the actual mappings.
         *   - file: Optional. The generated file this source map is associated with.
         *
         * Here is an example source map, taken from the source map spec[0]:
         *
         *     {
         *       version : 3,
         *       file: "out.js",
         *       sourceRoot : "",
         *       sources: ["foo.js", "bar.js"],
         *       names: ["src", "maps", "are", "fun"],
         *       mappings: "AA,AB;;ABCDE;"
         *     }
         *
         * The second parameter, if given, is a string whose value is the URL
         * at which the source map was found.  This URL is used to compute the
         * sources array.
         *
         * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
         */
        function BasicSourceMapConsumer(aSourceMap, aSourceMapURL) {
            var sourceMap = aSourceMap;
            if (typeof aSourceMap === 'string') {
                sourceMap = util.parseSourceMapInput(aSourceMap);
            }

            var version = util.getArg(sourceMap, 'version');
            var sources = util.getArg(sourceMap, 'sources');
            // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
            // requires the array) to play nice here.
            var names = util.getArg(sourceMap, 'names', []);
            var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
            var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
            var mappings = util.getArg(sourceMap, 'mappings');
            var file = util.getArg(sourceMap, 'file', null);

            // Once again, Sass deviates from the spec and supplies the version as a
            // string rather than a number, so we use loose equality checking here.
            if (version != this._version) {
                throw new Error('Unsupported version: ' + version);
            }

            if (sourceRoot) {
                sourceRoot = util.normalize(sourceRoot);
            }

            sources = sources.map(String)
            // Some source maps produce relative source paths like "./foo.js" instead of
            // "foo.js".  Normalize these first so that future comparisons will succeed.
            // See bugzil.la/1090768.
            .map(util.normalize)
            // Always ensure that absolute sources are internally stored relative to
            // the source root, if the source root is absolute. Not doing this would
            // be particularly problematic when the source root is a prefix of the
            // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
            .map(function (source) {
                return sourceRoot && util.isAbsolute(sourceRoot) && util.isAbsolute(source) ? util.relative(sourceRoot, source) : source;
            });

            // Pass `true` below to allow duplicate names and sources. While source maps
            // are intended to be compressed and deduplicated, the TypeScript compiler
            // sometimes generates source maps with duplicates in them. See Github issue
            // #72 and bugzil.la/889492.
            this._names = ArraySet.fromArray(names.map(String), true);
            this._sources = ArraySet.fromArray(sources, true);

            this._absoluteSources = this._sources.toArray().map(function (s) {
                return util.computeSourceURL(sourceRoot, s, aSourceMapURL);
            });

            this.sourceRoot = sourceRoot;
            this.sourcesContent = sourcesContent;
            this._mappings = mappings;
            this._sourceMapURL = aSourceMapURL;
            this.file = file;
        }

        BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
        BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;

        /**
         * Utility function to find the index of a source.  Returns -1 if not
         * found.
         */
        BasicSourceMapConsumer.prototype._findSourceIndex = function (aSource) {
            var relativeSource = aSource;
            if (this.sourceRoot != null) {
                relativeSource = util.relative(this.sourceRoot, relativeSource);
            }

            if (this._sources.has(relativeSource)) {
                return this._sources.indexOf(relativeSource);
            }

            // Maybe aSource is an absolute URL as returned by |sources|.  In
            // this case we can't simply undo the transform.
            var i;
            for (i = 0; i < this._absoluteSources.length; ++i) {
                if (this._absoluteSources[i] == aSource) {
                    return i;
                }
            }

            return -1;
        };

        /**
         * Create a BasicSourceMapConsumer from a SourceMapGenerator.
         *
         * @param SourceMapGenerator aSourceMap
         *        The source map that will be consumed.
         * @param String aSourceMapURL
         *        The URL at which the source map can be found (optional)
         * @returns BasicSourceMapConsumer
         */
        BasicSourceMapConsumer.fromSourceMap = function SourceMapConsumer_fromSourceMap(aSourceMap, aSourceMapURL) {
            var smc = Object.create(BasicSourceMapConsumer.prototype);

            var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
            var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
            smc.sourceRoot = aSourceMap._sourceRoot;
            smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(), smc.sourceRoot);
            smc.file = aSourceMap._file;
            smc._sourceMapURL = aSourceMapURL;
            smc._absoluteSources = smc._sources.toArray().map(function (s) {
                return util.computeSourceURL(smc.sourceRoot, s, aSourceMapURL);
            });

            // Because we are modifying the entries (by converting string sources and
            // names to indices into the sources and names ArraySets), we have to make
            // a copy of the entry or else bad things happen. Shared mutable state
            // strikes again! See github issue #191.

            var generatedMappings = aSourceMap._mappings.toArray().slice();
            var destGeneratedMappings = smc.__generatedMappings = [];
            var destOriginalMappings = smc.__originalMappings = [];

            for (var i = 0, length = generatedMappings.length; i < length; i++) {
                var srcMapping = generatedMappings[i];
                var destMapping = new Mapping();
                destMapping.generatedLine = srcMapping.generatedLine;
                destMapping.generatedColumn = srcMapping.generatedColumn;

                if (srcMapping.source) {
                    destMapping.source = sources.indexOf(srcMapping.source);
                    destMapping.originalLine = srcMapping.originalLine;
                    destMapping.originalColumn = srcMapping.originalColumn;

                    if (srcMapping.name) {
                        destMapping.name = names.indexOf(srcMapping.name);
                    }

                    destOriginalMappings.push(destMapping);
                }

                destGeneratedMappings.push(destMapping);
            }

            quickSort(smc.__originalMappings, util.compareByOriginalPositions);

            return smc;
        };

        /**
         * The version of the source mapping spec that we are consuming.
         */
        BasicSourceMapConsumer.prototype._version = 3;

        /**
         * The list of original sources.
         */
        Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {
            get: function get() {
                return this._absoluteSources.slice();
            }
        });

        /**
         * Provide the JIT with a nice shape / hidden class.
         */
        function Mapping() {
            this.generatedLine = 0;
            this.generatedColumn = 0;
            this.source = null;
            this.originalLine = null;
            this.originalColumn = null;
            this.name = null;
        }

        /**
         * Parse the mappings in a string in to a data structure which we can easily
         * query (the ordered arrays in the `this.__generatedMappings` and
         * `this.__originalMappings` properties).
         */
        BasicSourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
            var generatedLine = 1;
            var previousGeneratedColumn = 0;
            var previousOriginalLine = 0;
            var previousOriginalColumn = 0;
            var previousSource = 0;
            var previousName = 0;
            var length = aStr.length;
            var index = 0;
            var cachedSegments = {};
            var temp = {};
            var originalMappings = [];
            var generatedMappings = [];
            var mapping, str, segment, end, value;

            while (index < length) {
                if (aStr.charAt(index) === ';') {
                    generatedLine++;
                    index++;
                    previousGeneratedColumn = 0;
                } else if (aStr.charAt(index) === ',') {
                    index++;
                } else {
                    mapping = new Mapping();
                    mapping.generatedLine = generatedLine;

                    // Because each offset is encoded relative to the previous one,
                    // many segments often have the same encoding. We can exploit this
                    // fact by caching the parsed variable length fields of each segment,
                    // allowing us to avoid a second parse if we encounter the same
                    // segment again.
                    for (end = index; end < length; end++) {
                        if (this._charIsMappingSeparator(aStr, end)) {
                            break;
                        }
                    }
                    str = aStr.slice(index, end);

                    segment = cachedSegments[str];
                    if (segment) {
                        index += str.length;
                    } else {
                        segment = [];
                        while (index < end) {
                            base64VLQ.decode(aStr, index, temp);
                            value = temp.value;
                            index = temp.rest;
                            segment.push(value);
                        }

                        if (segment.length === 2) {
                            throw new Error('Found a source, but no line and column');
                        }

                        if (segment.length === 3) {
                            throw new Error('Found a source and line, but no column');
                        }

                        cachedSegments[str] = segment;
                    }

                    // Generated column.
                    mapping.generatedColumn = previousGeneratedColumn + segment[0];
                    previousGeneratedColumn = mapping.generatedColumn;

                    if (segment.length > 1) {
                        // Original source.
                        mapping.source = previousSource + segment[1];
                        previousSource += segment[1];

                        // Original line.
                        mapping.originalLine = previousOriginalLine + segment[2];
                        previousOriginalLine = mapping.originalLine;
                        // Lines are stored 0-based
                        mapping.originalLine += 1;

                        // Original column.
                        mapping.originalColumn = previousOriginalColumn + segment[3];
                        previousOriginalColumn = mapping.originalColumn;

                        if (segment.length > 4) {
                            // Original name.
                            mapping.name = previousName + segment[4];
                            previousName += segment[4];
                        }
                    }

                    generatedMappings.push(mapping);
                    if (typeof mapping.originalLine === 'number') {
                        originalMappings.push(mapping);
                    }
                }
            }

            quickSort(generatedMappings, util.compareByGeneratedPositionsDeflated);
            this.__generatedMappings = generatedMappings;

            quickSort(originalMappings, util.compareByOriginalPositions);
            this.__originalMappings = originalMappings;
        };

        /**
         * Find the mapping that best matches the hypothetical "needle" mapping that
         * we are searching for in the given "haystack" of mappings.
         */
        BasicSourceMapConsumer.prototype._findMapping = function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName, aColumnName, aComparator, aBias) {
            // To return the position we are searching for, we must first find the
            // mapping for the given position and then return the opposite position it
            // points to. Because the mappings are sorted, we can use binary search to
            // find the best mapping.

            if (aNeedle[aLineName] <= 0) {
                throw new TypeError('Line must be greater than or equal to 1, got ' + aNeedle[aLineName]);
            }
            if (aNeedle[aColumnName] < 0) {
                throw new TypeError('Column must be greater than or equal to 0, got ' + aNeedle[aColumnName]);
            }

            return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
        };

        /**
         * Compute the last column for each generated mapping. The last column is
         * inclusive.
         */
        BasicSourceMapConsumer.prototype.computeColumnSpans = function SourceMapConsumer_computeColumnSpans() {
            for (var index = 0; index < this._generatedMappings.length; ++index) {
                var mapping = this._generatedMappings[index];

                // Mappings do not contain a field for the last generated columnt. We
                // can come up with an optimistic estimate, however, by assuming that
                // mappings are contiguous (i.e. given two consecutive mappings, the
                // first mapping ends where the second one starts).
                if (index + 1 < this._generatedMappings.length) {
                    var nextMapping = this._generatedMappings[index + 1];

                    if (mapping.generatedLine === nextMapping.generatedLine) {
                        mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
                        continue;
                    }
                }

                // The last mapping for each line spans the entire line.
                mapping.lastGeneratedColumn = Infinity;
            }
        };

        /**
         * Returns the original source, line, and column information for the generated
         * source's line and column positions provided. The only argument is an object
         * with the following properties:
         *
         *   - line: The line number in the generated source.  The line number
         *     is 1-based.
         *   - column: The column number in the generated source.  The column
         *     number is 0-based.
         *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
         *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
         *     closest element that is smaller than or greater than the one we are
         *     searching for, respectively, if the exact element cannot be found.
         *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
         *
         * and an object is returned with the following properties:
         *
         *   - source: The original source file, or null.
         *   - line: The line number in the original source, or null.  The
         *     line number is 1-based.
         *   - column: The column number in the original source, or null.  The
         *     column number is 0-based.
         *   - name: The original identifier, or null.
         */
        BasicSourceMapConsumer.prototype.originalPositionFor = function SourceMapConsumer_originalPositionFor(aArgs) {
            var needle = {
                generatedLine: util.getArg(aArgs, 'line'),
                generatedColumn: util.getArg(aArgs, 'column')
            };

            var index = this._findMapping(needle, this._generatedMappings, "generatedLine", "generatedColumn", util.compareByGeneratedPositionsDeflated, util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND));

            if (index >= 0) {
                var mapping = this._generatedMappings[index];

                if (mapping.generatedLine === needle.generatedLine) {
                    var source = util.getArg(mapping, 'source', null);
                    if (source !== null) {
                        source = this._sources.at(source);
                        source = util.computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
                    }
                    var name = util.getArg(mapping, 'name', null);
                    if (name !== null) {
                        name = this._names.at(name);
                    }
                    return {
                        source: source,
                        line: util.getArg(mapping, 'originalLine', null),
                        column: util.getArg(mapping, 'originalColumn', null),
                        name: name
                    };
                }
            }

            return {
                source: null,
                line: null,
                column: null,
                name: null
            };
        };

        /**
         * Return true if we have the source content for every source in the source
         * map, false otherwise.
         */
        BasicSourceMapConsumer.prototype.hasContentsOfAllSources = function BasicSourceMapConsumer_hasContentsOfAllSources() {
            if (!this.sourcesContent) {
                return false;
            }
            return this.sourcesContent.length >= this._sources.size() && !this.sourcesContent.some(function (sc) {
                return sc == null;
            });
        };

        /**
         * Returns the original source content. The only argument is the url of the
         * original source file. Returns null if no original source content is
         * available.
         */
        BasicSourceMapConsumer.prototype.sourceContentFor = function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
            if (!this.sourcesContent) {
                return null;
            }

            var index = this._findSourceIndex(aSource);
            if (index >= 0) {
                return this.sourcesContent[index];
            }

            var relativeSource = aSource;
            if (this.sourceRoot != null) {
                relativeSource = util.relative(this.sourceRoot, relativeSource);
            }

            var url;
            if (this.sourceRoot != null && (url = util.urlParse(this.sourceRoot))) {
                // XXX: file:// URIs and absolute paths lead to unexpected behavior for
                // many users. We can help them out when they expect file:// URIs to
                // behave like it would if they were running a local HTTP server. See
                // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
                var fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");
                if (url.scheme == "file" && this._sources.has(fileUriAbsPath)) {
                    return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)];
                }

                if ((!url.path || url.path == "/") && this._sources.has("/" + relativeSource)) {
                    return this.sourcesContent[this._sources.indexOf("/" + relativeSource)];
                }
            }

            // This function is used recursively from
            // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
            // don't want to throw if we can't find the source - we just want to
            // return null, so we provide a flag to exit gracefully.
            if (nullOnMissing) {
                return null;
            } else {
                throw new Error('"' + relativeSource + '" is not in the SourceMap.');
            }
        };

        /**
         * Returns the generated line and column information for the original source,
         * line, and column positions provided. The only argument is an object with
         * the following properties:
         *
         *   - source: The filename of the original source.
         *   - line: The line number in the original source.  The line number
         *     is 1-based.
         *   - column: The column number in the original source.  The column
         *     number is 0-based.
         *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
         *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
         *     closest element that is smaller than or greater than the one we are
         *     searching for, respectively, if the exact element cannot be found.
         *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
         *
         * and an object is returned with the following properties:
         *
         *   - line: The line number in the generated source, or null.  The
         *     line number is 1-based.
         *   - column: The column number in the generated source, or null.
         *     The column number is 0-based.
         */
        BasicSourceMapConsumer.prototype.generatedPositionFor = function SourceMapConsumer_generatedPositionFor(aArgs) {
            var source = util.getArg(aArgs, 'source');
            source = this._findSourceIndex(source);
            if (source < 0) {
                return {
                    line: null,
                    column: null,
                    lastColumn: null
                };
            }

            var needle = {
                source: source,
                originalLine: util.getArg(aArgs, 'line'),
                originalColumn: util.getArg(aArgs, 'column')
            };

            var index = this._findMapping(needle, this._originalMappings, "originalLine", "originalColumn", util.compareByOriginalPositions, util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND));

            if (index >= 0) {
                var mapping = this._originalMappings[index];

                if (mapping.source === needle.source) {
                    return {
                        line: util.getArg(mapping, 'generatedLine', null),
                        column: util.getArg(mapping, 'generatedColumn', null),
                        lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
                    };
                }
            }

            return {
                line: null,
                column: null,
                lastColumn: null
            };
        };

        exports.BasicSourceMapConsumer = BasicSourceMapConsumer;

        /**
         * An IndexedSourceMapConsumer instance represents a parsed source map which
         * we can query for information. It differs from BasicSourceMapConsumer in
         * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
         * input.
         *
         * The first parameter is a raw source map (either as a JSON string, or already
         * parsed to an object). According to the spec for indexed source maps, they
         * have the following attributes:
         *
         *   - version: Which version of the source map spec this map is following.
         *   - file: Optional. The generated file this source map is associated with.
         *   - sections: A list of section definitions.
         *
         * Each value under the "sections" field has two fields:
         *   - offset: The offset into the original specified at which this section
         *       begins to apply, defined as an object with a "line" and "column"
         *       field.
         *   - map: A source map definition. This source map could also be indexed,
         *       but doesn't have to be.
         *
         * Instead of the "map" field, it's also possible to have a "url" field
         * specifying a URL to retrieve a source map from, but that's currently
         * unsupported.
         *
         * Here's an example source map, taken from the source map spec[0], but
         * modified to omit a section which uses the "url" field.
         *
         *  {
         *    version : 3,
         *    file: "app.js",
         *    sections: [{
         *      offset: {line:100, column:10},
         *      map: {
         *        version : 3,
         *        file: "section.js",
         *        sources: ["foo.js", "bar.js"],
         *        names: ["src", "maps", "are", "fun"],
         *        mappings: "AAAA,E;;ABCDE;"
         *      }
         *    }],
         *  }
         *
         * The second parameter, if given, is a string whose value is the URL
         * at which the source map was found.  This URL is used to compute the
         * sources array.
         *
         * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
         */
        function IndexedSourceMapConsumer(aSourceMap, aSourceMapURL) {
            var sourceMap = aSourceMap;
            if (typeof aSourceMap === 'string') {
                sourceMap = util.parseSourceMapInput(aSourceMap);
            }

            var version = util.getArg(sourceMap, 'version');
            var sections = util.getArg(sourceMap, 'sections');

            if (version != this._version) {
                throw new Error('Unsupported version: ' + version);
            }

            this._sources = new ArraySet();
            this._names = new ArraySet();

            var lastOffset = {
                line: -1,
                column: 0
            };
            this._sections = sections.map(function (s) {
                if (s.url) {
                    // The url field will require support for asynchronicity.
                    // See https://github.com/mozilla/source-map/issues/16
                    throw new Error('Support for url field in sections not implemented.');
                }
                var offset = util.getArg(s, 'offset');
                var offsetLine = util.getArg(offset, 'line');
                var offsetColumn = util.getArg(offset, 'column');

                if (offsetLine < lastOffset.line || offsetLine === lastOffset.line && offsetColumn < lastOffset.column) {
                    throw new Error('Section offsets must be ordered and non-overlapping.');
                }
                lastOffset = offset;

                return {
                    generatedOffset: {
                        // The offset fields are 0-based, but we use 1-based indices when
                        // encoding/decoding from VLQ.
                        generatedLine: offsetLine + 1,
                        generatedColumn: offsetColumn + 1
                    },
                    consumer: new SourceMapConsumer(util.getArg(s, 'map'), aSourceMapURL)
                };
            });
        }

        IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
        IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;

        /**
         * The version of the source mapping spec that we are consuming.
         */
        IndexedSourceMapConsumer.prototype._version = 3;

        /**
         * The list of original sources.
         */
        Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {
            get: function get() {
                var sources = [];
                for (var i = 0; i < this._sections.length; i++) {
                    for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
                        sources.push(this._sections[i].consumer.sources[j]);
                    }
                }
                return sources;
            }
        });

        /**
         * Returns the original source, line, and column information for the generated
         * source's line and column positions provided. The only argument is an object
         * with the following properties:
         *
         *   - line: The line number in the generated source.  The line number
         *     is 1-based.
         *   - column: The column number in the generated source.  The column
         *     number is 0-based.
         *
         * and an object is returned with the following properties:
         *
         *   - source: The original source file, or null.
         *   - line: The line number in the original source, or null.  The
         *     line number is 1-based.
         *   - column: The column number in the original source, or null.  The
         *     column number is 0-based.
         *   - name: The original identifier, or null.
         */
        IndexedSourceMapConsumer.prototype.originalPositionFor = function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
            var needle = {
                generatedLine: util.getArg(aArgs, 'line'),
                generatedColumn: util.getArg(aArgs, 'column')
            };

            // Find the section containing the generated position we're trying to map
            // to an original position.
            var sectionIndex = binarySearch.search(needle, this._sections, function (needle, section) {
                var cmp = needle.generatedLine - section.generatedOffset.generatedLine;
                if (cmp) {
                    return cmp;
                }

                return needle.generatedColumn - section.generatedOffset.generatedColumn;
            });
            var section = this._sections[sectionIndex];

            if (!section) {
                return {
                    source: null,
                    line: null,
                    column: null,
                    name: null
                };
            }

            return section.consumer.originalPositionFor({
                line: needle.generatedLine - (section.generatedOffset.generatedLine - 1),
                column: needle.generatedColumn - (section.generatedOffset.generatedLine === needle.generatedLine ? section.generatedOffset.generatedColumn - 1 : 0),
                bias: aArgs.bias
            });
        };

        /**
         * Return true if we have the source content for every source in the source
         * map, false otherwise.
         */
        IndexedSourceMapConsumer.prototype.hasContentsOfAllSources = function IndexedSourceMapConsumer_hasContentsOfAllSources() {
            return this._sections.every(function (s) {
                return s.consumer.hasContentsOfAllSources();
            });
        };

        /**
         * Returns the original source content. The only argument is the url of the
         * original source file. Returns null if no original source content is
         * available.
         */
        IndexedSourceMapConsumer.prototype.sourceContentFor = function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
            for (var i = 0; i < this._sections.length; i++) {
                var section = this._sections[i];

                var content = section.consumer.sourceContentFor(aSource, true);
                if (content) {
                    return content;
                }
            }
            if (nullOnMissing) {
                return null;
            } else {
                throw new Error('"' + aSource + '" is not in the SourceMap.');
            }
        };

        /**
         * Returns the generated line and column information for the original source,
         * line, and column positions provided. The only argument is an object with
         * the following properties:
         *
         *   - source: The filename of the original source.
         *   - line: The line number in the original source.  The line number
         *     is 1-based.
         *   - column: The column number in the original source.  The column
         *     number is 0-based.
         *
         * and an object is returned with the following properties:
         *
         *   - line: The line number in the generated source, or null.  The
         *     line number is 1-based.
         *   - column: The column number in the generated source, or null.
         *     The column number is 0-based.
         */
        IndexedSourceMapConsumer.prototype.generatedPositionFor = function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
            for (var i = 0; i < this._sections.length; i++) {
                var section = this._sections[i];

                // Only consider this section if the requested source is in the list of
                // sources of the consumer.
                if (section.consumer._findSourceIndex(util.getArg(aArgs, 'source')) === -1) {
                    continue;
                }
                var generatedPosition = section.consumer.generatedPositionFor(aArgs);
                if (generatedPosition) {
                    var ret = {
                        line: generatedPosition.line + (section.generatedOffset.generatedLine - 1),
                        column: generatedPosition.column + (section.generatedOffset.generatedLine === generatedPosition.line ? section.generatedOffset.generatedColumn - 1 : 0)
                    };
                    return ret;
                }
            }

            return {
                line: null,
                column: null
            };
        };

        /**
         * Parse the mappings in a string in to a data structure which we can easily
         * query (the ordered arrays in the `this.__generatedMappings` and
         * `this.__originalMappings` properties).
         */
        IndexedSourceMapConsumer.prototype._parseMappings = function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
            this.__generatedMappings = [];
            this.__originalMappings = [];
            for (var i = 0; i < this._sections.length; i++) {
                var section = this._sections[i];
                var sectionMappings = section.consumer._generatedMappings;
                for (var j = 0; j < sectionMappings.length; j++) {
                    var mapping = sectionMappings[j];

                    var source = section.consumer._sources.at(mapping.source);
                    source = util.computeSourceURL(section.consumer.sourceRoot, source, this._sourceMapURL);
                    this._sources.add(source);
                    source = this._sources.indexOf(source);

                    var name = null;
                    if (mapping.name) {
                        name = section.consumer._names.at(mapping.name);
                        this._names.add(name);
                        name = this._names.indexOf(name);
                    }

                    // The mappings coming from the consumer for the section have
                    // generated positions relative to the start of the section, so we
                    // need to offset them to be relative to the start of the concatenated
                    // generated file.
                    var adjustedMapping = {
                        source: source,
                        generatedLine: mapping.generatedLine + (section.generatedOffset.generatedLine - 1),
                        generatedColumn: mapping.generatedColumn + (section.generatedOffset.generatedLine === mapping.generatedLine ? section.generatedOffset.generatedColumn - 1 : 0),
                        originalLine: mapping.originalLine,
                        originalColumn: mapping.originalColumn,
                        name: name
                    };

                    this.__generatedMappings.push(adjustedMapping);
                    if (typeof adjustedMapping.originalLine === 'number') {
                        this.__originalMappings.push(adjustedMapping);
                    }
                }
            }

            quickSort(this.__generatedMappings, util.compareByGeneratedPositionsDeflated);
            quickSort(this.__originalMappings, util.compareByOriginalPositions);
        };

        exports.IndexedSourceMapConsumer = IndexedSourceMapConsumer;
    }, { "./array-set": 2, "./base64-vlq": 3, "./binary-search": 5, "./quick-sort": 7, "./util": 11 }], 9: [function (require, module, exports) {
        /* -*- Mode: js; js-indent-level: 2; -*- */
        /*
         * Copyright 2011 Mozilla Foundation and contributors
         * Licensed under the New BSD license. See LICENSE or:
         * http://opensource.org/licenses/BSD-3-Clause
         */

        var base64VLQ = require('./base64-vlq');
        var util = require('./util');
        var ArraySet = require('./array-set').ArraySet;
        var MappingList = require('./mapping-list').MappingList;

        /**
         * An instance of the SourceMapGenerator represents a source map which is
         * being built incrementally. You may pass an object with the following
         * properties:
         *
         *   - file: The filename of the generated source.
         *   - sourceRoot: A root for all relative URLs in this source map.
         */
        function SourceMapGenerator(aArgs) {
            if (!aArgs) {
                aArgs = {};
            }
            this._file = util.getArg(aArgs, 'file', null);
            this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
            this._skipValidation = util.getArg(aArgs, 'skipValidation', false);
            this._sources = new ArraySet();
            this._names = new ArraySet();
            this._mappings = new MappingList();
            this._sourcesContents = null;
        }

        SourceMapGenerator.prototype._version = 3;

        /**
         * Creates a new SourceMapGenerator based on a SourceMapConsumer
         *
         * @param aSourceMapConsumer The SourceMap.
         */
        SourceMapGenerator.fromSourceMap = function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
            var sourceRoot = aSourceMapConsumer.sourceRoot;
            var generator = new SourceMapGenerator({
                file: aSourceMapConsumer.file,
                sourceRoot: sourceRoot
            });
            aSourceMapConsumer.eachMapping(function (mapping) {
                var newMapping = {
                    generated: {
                        line: mapping.generatedLine,
                        column: mapping.generatedColumn
                    }
                };

                if (mapping.source != null) {
                    newMapping.source = mapping.source;
                    if (sourceRoot != null) {
                        newMapping.source = util.relative(sourceRoot, newMapping.source);
                    }

                    newMapping.original = {
                        line: mapping.originalLine,
                        column: mapping.originalColumn
                    };

                    if (mapping.name != null) {
                        newMapping.name = mapping.name;
                    }
                }

                generator.addMapping(newMapping);
            });
            aSourceMapConsumer.sources.forEach(function (sourceFile) {
                var sourceRelative = sourceFile;
                if (sourceRoot !== null) {
                    sourceRelative = util.relative(sourceRoot, sourceFile);
                }

                if (!generator._sources.has(sourceRelative)) {
                    generator._sources.add(sourceRelative);
                }

                var content = aSourceMapConsumer.sourceContentFor(sourceFile);
                if (content != null) {
                    generator.setSourceContent(sourceFile, content);
                }
            });
            return generator;
        };

        /**
         * Add a single mapping from original source line and column to the generated
         * source's line and column for this source map being created. The mapping
         * object should have the following properties:
         *
         *   - generated: An object with the generated line and column positions.
         *   - original: An object with the original line and column positions.
         *   - source: The original source file (relative to the sourceRoot).
         *   - name: An optional original token name for this mapping.
         */
        SourceMapGenerator.prototype.addMapping = function SourceMapGenerator_addMapping(aArgs) {
            var generated = util.getArg(aArgs, 'generated');
            var original = util.getArg(aArgs, 'original', null);
            var source = util.getArg(aArgs, 'source', null);
            var name = util.getArg(aArgs, 'name', null);

            if (!this._skipValidation) {
                this._validateMapping(generated, original, source, name);
            }

            if (source != null) {
                source = String(source);
                if (!this._sources.has(source)) {
                    this._sources.add(source);
                }
            }

            if (name != null) {
                name = String(name);
                if (!this._names.has(name)) {
                    this._names.add(name);
                }
            }

            this._mappings.add({
                generatedLine: generated.line,
                generatedColumn: generated.column,
                originalLine: original != null && original.line,
                originalColumn: original != null && original.column,
                source: source,
                name: name
            });
        };

        /**
         * Set the source content for a source file.
         */
        SourceMapGenerator.prototype.setSourceContent = function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
            var source = aSourceFile;
            if (this._sourceRoot != null) {
                source = util.relative(this._sourceRoot, source);
            }

            if (aSourceContent != null) {
                // Add the source content to the _sourcesContents map.
                // Create a new _sourcesContents map if the property is null.
                if (!this._sourcesContents) {
                    this._sourcesContents = Object.create(null);
                }
                this._sourcesContents[util.toSetString(source)] = aSourceContent;
            } else if (this._sourcesContents) {
                // Remove the source file from the _sourcesContents map.
                // If the _sourcesContents map is empty, set the property to null.
                delete this._sourcesContents[util.toSetString(source)];
                if (Object.keys(this._sourcesContents).length === 0) {
                    this._sourcesContents = null;
                }
            }
        };

        /**
         * Applies the mappings of a sub-source-map for a specific source file to the
         * source map being generated. Each mapping to the supplied source file is
         * rewritten using the supplied source map. Note: The resolution for the
         * resulting mappings is the minimium of this map and the supplied map.
         *
         * @param aSourceMapConsumer The source map to be applied.
         * @param aSourceFile Optional. The filename of the source file.
         *        If omitted, SourceMapConsumer's file property will be used.
         * @param aSourceMapPath Optional. The dirname of the path to the source map
         *        to be applied. If relative, it is relative to the SourceMapConsumer.
         *        This parameter is needed when the two source maps aren't in the same
         *        directory, and the source map to be applied contains relative source
         *        paths. If so, those relative source paths need to be rewritten
         *        relative to the SourceMapGenerator.
         */
        SourceMapGenerator.prototype.applySourceMap = function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
            var sourceFile = aSourceFile;
            // If aSourceFile is omitted, we will use the file property of the SourceMap
            if (aSourceFile == null) {
                if (aSourceMapConsumer.file == null) {
                    throw new Error('SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' + 'or the source map\'s "file" property. Both were omitted.');
                }
                sourceFile = aSourceMapConsumer.file;
            }
            var sourceRoot = this._sourceRoot;
            // Make "sourceFile" relative if an absolute Url is passed.
            if (sourceRoot != null) {
                sourceFile = util.relative(sourceRoot, sourceFile);
            }
            // Applying the SourceMap can add and remove items from the sources and
            // the names array.
            var newSources = new ArraySet();
            var newNames = new ArraySet();

            // Find mappings for the "sourceFile"
            this._mappings.unsortedForEach(function (mapping) {
                if (mapping.source === sourceFile && mapping.originalLine != null) {
                    // Check if it can be mapped by the source map, then update the mapping.
                    var original = aSourceMapConsumer.originalPositionFor({
                        line: mapping.originalLine,
                        column: mapping.originalColumn
                    });
                    if (original.source != null) {
                        // Copy mapping
                        mapping.source = original.source;
                        if (aSourceMapPath != null) {
                            mapping.source = util.join(aSourceMapPath, mapping.source);
                        }
                        if (sourceRoot != null) {
                            mapping.source = util.relative(sourceRoot, mapping.source);
                        }
                        mapping.originalLine = original.line;
                        mapping.originalColumn = original.column;
                        if (original.name != null) {
                            mapping.name = original.name;
                        }
                    }
                }

                var source = mapping.source;
                if (source != null && !newSources.has(source)) {
                    newSources.add(source);
                }

                var name = mapping.name;
                if (name != null && !newNames.has(name)) {
                    newNames.add(name);
                }
            }, this);
            this._sources = newSources;
            this._names = newNames;

            // Copy sourcesContents of applied map.
            aSourceMapConsumer.sources.forEach(function (sourceFile) {
                var content = aSourceMapConsumer.sourceContentFor(sourceFile);
                if (content != null) {
                    if (aSourceMapPath != null) {
                        sourceFile = util.join(aSourceMapPath, sourceFile);
                    }
                    if (sourceRoot != null) {
                        sourceFile = util.relative(sourceRoot, sourceFile);
                    }
                    this.setSourceContent(sourceFile, content);
                }
            }, this);
        };

        /**
         * A mapping can have one of the three levels of data:
         *
         *   1. Just the generated position.
         *   2. The Generated position, original position, and original source.
         *   3. Generated and original position, original source, as well as a name
         *      token.
         *
         * To maintain consistency, we validate that any new mapping being added falls
         * in to one of these categories.
         */
        SourceMapGenerator.prototype._validateMapping = function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource, aName) {
            // When aOriginal is truthy but has empty values for .line and .column,
            // it is most likely a programmer error. In this case we throw a very
            // specific error message to try to guide them the right way.
            // For example: https://github.com/Polymer/polymer-bundler/pull/519
            if (aOriginal && typeof aOriginal.line !== 'number' && typeof aOriginal.column !== 'number') {
                throw new Error('original.line and original.column are not numbers -- you probably meant to omit ' + 'the original mapping entirely and only map the generated position. If so, pass ' + 'null for the original mapping instead of an object with empty or null values.');
            }

            if (aGenerated && 'line' in aGenerated && 'column' in aGenerated && aGenerated.line > 0 && aGenerated.column >= 0 && !aOriginal && !aSource && !aName) {
                // Case 1.
                return;
            } else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated && aOriginal && 'line' in aOriginal && 'column' in aOriginal && aGenerated.line > 0 && aGenerated.column >= 0 && aOriginal.line > 0 && aOriginal.column >= 0 && aSource) {
                // Cases 2 and 3.
                return;
            } else {
                throw new Error('Invalid mapping: ' + JSON.stringify({
                    generated: aGenerated,
                    source: aSource,
                    original: aOriginal,
                    name: aName
                }));
            }
        };

        /**
         * Serialize the accumulated mappings in to the stream of base 64 VLQs
         * specified by the source map format.
         */
        SourceMapGenerator.prototype._serializeMappings = function SourceMapGenerator_serializeMappings() {
            var previousGeneratedColumn = 0;
            var previousGeneratedLine = 1;
            var previousOriginalColumn = 0;
            var previousOriginalLine = 0;
            var previousName = 0;
            var previousSource = 0;
            var result = '';
            var next;
            var mapping;
            var nameIdx;
            var sourceIdx;

            var mappings = this._mappings.toArray();
            for (var i = 0, len = mappings.length; i < len; i++) {
                mapping = mappings[i];
                next = '';

                if (mapping.generatedLine !== previousGeneratedLine) {
                    previousGeneratedColumn = 0;
                    while (mapping.generatedLine !== previousGeneratedLine) {
                        next += ';';
                        previousGeneratedLine++;
                    }
                } else {
                    if (i > 0) {
                        if (!util.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
                            continue;
                        }
                        next += ',';
                    }
                }

                next += base64VLQ.encode(mapping.generatedColumn - previousGeneratedColumn);
                previousGeneratedColumn = mapping.generatedColumn;

                if (mapping.source != null) {
                    sourceIdx = this._sources.indexOf(mapping.source);
                    next += base64VLQ.encode(sourceIdx - previousSource);
                    previousSource = sourceIdx;

                    // lines are stored 0-based in SourceMap spec version 3
                    next += base64VLQ.encode(mapping.originalLine - 1 - previousOriginalLine);
                    previousOriginalLine = mapping.originalLine - 1;

                    next += base64VLQ.encode(mapping.originalColumn - previousOriginalColumn);
                    previousOriginalColumn = mapping.originalColumn;

                    if (mapping.name != null) {
                        nameIdx = this._names.indexOf(mapping.name);
                        next += base64VLQ.encode(nameIdx - previousName);
                        previousName = nameIdx;
                    }
                }

                result += next;
            }

            return result;
        };

        SourceMapGenerator.prototype._generateSourcesContent = function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
            return aSources.map(function (source) {
                if (!this._sourcesContents) {
                    return null;
                }
                if (aSourceRoot != null) {
                    source = util.relative(aSourceRoot, source);
                }
                var key = util.toSetString(source);
                return Object.prototype.hasOwnProperty.call(this._sourcesContents, key) ? this._sourcesContents[key] : null;
            }, this);
        };

        /**
         * Externalize the source map.
         */
        SourceMapGenerator.prototype.toJSON = function SourceMapGenerator_toJSON() {
            var map = {
                version: this._version,
                sources: this._sources.toArray(),
                names: this._names.toArray(),
                mappings: this._serializeMappings()
            };
            if (this._file != null) {
                map.file = this._file;
            }
            if (this._sourceRoot != null) {
                map.sourceRoot = this._sourceRoot;
            }
            if (this._sourcesContents) {
                map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
            }

            return map;
        };

        /**
         * Render the source map being generated to a string.
         */
        SourceMapGenerator.prototype.toString = function SourceMapGenerator_toString() {
            return JSON.stringify(this.toJSON());
        };

        exports.SourceMapGenerator = SourceMapGenerator;
    }, { "./array-set": 2, "./base64-vlq": 3, "./mapping-list": 6, "./util": 11 }], 10: [function (require, module, exports) {
        /* -*- Mode: js; js-indent-level: 2; -*- */
        /*
         * Copyright 2011 Mozilla Foundation and contributors
         * Licensed under the New BSD license. See LICENSE or:
         * http://opensource.org/licenses/BSD-3-Clause
         */

        var SourceMapGenerator = require('./source-map-generator').SourceMapGenerator;
        var util = require('./util');

        // Matches a Windows-style `\r\n` newline or a `\n` newline used by all other
        // operating systems these days (capturing the result).
        var REGEX_NEWLINE = /(\r?\n)/;

        // Newline character code for charCodeAt() comparisons
        var NEWLINE_CODE = 10;

        // Private symbol for identifying `SourceNode`s when multiple versions of
        // the source-map library are loaded. This MUST NOT CHANGE across
        // versions!
        var isSourceNode = "$$$isSourceNode$$$";

        /**
         * SourceNodes provide a way to abstract over interpolating/concatenating
         * snippets of generated JavaScript source code while maintaining the line and
         * column information associated with the original source code.
         *
         * @param aLine The original line number.
         * @param aColumn The original column number.
         * @param aSource The original source's filename.
         * @param aChunks Optional. An array of strings which are snippets of
         *        generated JS, or other SourceNodes.
         * @param aName The original identifier.
         */
        function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
            this.children = [];
            this.sourceContents = {};
            this.line = aLine == null ? null : aLine;
            this.column = aColumn == null ? null : aColumn;
            this.source = aSource == null ? null : aSource;
            this.name = aName == null ? null : aName;
            this[isSourceNode] = true;
            if (aChunks != null) this.add(aChunks);
        }

        /**
         * Creates a SourceNode from generated code and a SourceMapConsumer.
         *
         * @param aGeneratedCode The generated code
         * @param aSourceMapConsumer The SourceMap for the generated code
         * @param aRelativePath Optional. The path that relative sources in the
         *        SourceMapConsumer should be relative to.
         */
        SourceNode.fromStringWithSourceMap = function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
            // The SourceNode we want to fill with the generated code
            // and the SourceMap
            var node = new SourceNode();

            // All even indices of this array are one line of the generated code,
            // while all odd indices are the newlines between two adjacent lines
            // (since `REGEX_NEWLINE` captures its match).
            // Processed fragments are accessed by calling `shiftNextLine`.
            var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
            var remainingLinesIndex = 0;
            var shiftNextLine = function shiftNextLine() {
                var lineContents = getNextLine();
                // The last line of a file might not have a newline.
                var newLine = getNextLine() || "";
                return lineContents + newLine;

                function getNextLine() {
                    return remainingLinesIndex < remainingLines.length ? remainingLines[remainingLinesIndex++] : undefined;
                }
            };

            // We need to remember the position of "remainingLines"
            var lastGeneratedLine = 1,
                lastGeneratedColumn = 0;

            // The generate SourceNodes we need a code range.
            // To extract it current and last mapping is used.
            // Here we store the last mapping.
            var lastMapping = null;

            aSourceMapConsumer.eachMapping(function (mapping) {
                if (lastMapping !== null) {
                    // We add the code from "lastMapping" to "mapping":
                    // First check if there is a new line in between.
                    if (lastGeneratedLine < mapping.generatedLine) {
                        // Associate first line with "lastMapping"
                        addMappingWithCode(lastMapping, shiftNextLine());
                        lastGeneratedLine++;
                        lastGeneratedColumn = 0;
                        // The remaining code is added without mapping
                    } else {
                        // There is no new line in between.
                        // Associate the code between "lastGeneratedColumn" and
                        // "mapping.generatedColumn" with "lastMapping"
                        var nextLine = remainingLines[remainingLinesIndex] || '';
                        var code = nextLine.substr(0, mapping.generatedColumn - lastGeneratedColumn);
                        remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn - lastGeneratedColumn);
                        lastGeneratedColumn = mapping.generatedColumn;
                        addMappingWithCode(lastMapping, code);
                        // No more remaining code, continue
                        lastMapping = mapping;
                        return;
                    }
                }
                // We add the generated code until the first mapping
                // to the SourceNode without any mapping.
                // Each line is added as separate string.
                while (lastGeneratedLine < mapping.generatedLine) {
                    node.add(shiftNextLine());
                    lastGeneratedLine++;
                }
                if (lastGeneratedColumn < mapping.generatedColumn) {
                    var nextLine = remainingLines[remainingLinesIndex] || '';
                    node.add(nextLine.substr(0, mapping.generatedColumn));
                    remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn);
                    lastGeneratedColumn = mapping.generatedColumn;
                }
                lastMapping = mapping;
            }, this);
            // We have processed all mappings.
            if (remainingLinesIndex < remainingLines.length) {
                if (lastMapping) {
                    // Associate the remaining code in the current line with "lastMapping"
                    addMappingWithCode(lastMapping, shiftNextLine());
                }
                // and add the remaining lines without any mapping
                node.add(remainingLines.splice(remainingLinesIndex).join(""));
            }

            // Copy sourcesContent into SourceNode
            aSourceMapConsumer.sources.forEach(function (sourceFile) {
                var content = aSourceMapConsumer.sourceContentFor(sourceFile);
                if (content != null) {
                    if (aRelativePath != null) {
                        sourceFile = util.join(aRelativePath, sourceFile);
                    }
                    node.setSourceContent(sourceFile, content);
                }
            });

            return node;

            function addMappingWithCode(mapping, code) {
                if (mapping === null || mapping.source === undefined) {
                    node.add(code);
                } else {
                    var source = aRelativePath ? util.join(aRelativePath, mapping.source) : mapping.source;
                    node.add(new SourceNode(mapping.originalLine, mapping.originalColumn, source, code, mapping.name));
                }
            }
        };

        /**
         * Add a chunk of generated JS to this source node.
         *
         * @param aChunk A string snippet of generated JS code, another instance of
         *        SourceNode, or an array where each member is one of those things.
         */
        SourceNode.prototype.add = function SourceNode_add(aChunk) {
            if (Array.isArray(aChunk)) {
                aChunk.forEach(function (chunk) {
                    this.add(chunk);
                }, this);
            } else if (aChunk[isSourceNode] || typeof aChunk === "string") {
                if (aChunk) {
                    this.children.push(aChunk);
                }
            } else {
                throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk);
            }
            return this;
        };

        /**
         * Add a chunk of generated JS to the beginning of this source node.
         *
         * @param aChunk A string snippet of generated JS code, another instance of
         *        SourceNode, or an array where each member is one of those things.
         */
        SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
            if (Array.isArray(aChunk)) {
                for (var i = aChunk.length - 1; i >= 0; i--) {
                    this.prepend(aChunk[i]);
                }
            } else if (aChunk[isSourceNode] || typeof aChunk === "string") {
                this.children.unshift(aChunk);
            } else {
                throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk);
            }
            return this;
        };

        /**
         * Walk over the tree of JS snippets in this node and its children. The
         * walking function is called once for each snippet of JS and is passed that
         * snippet and the its original associated source's line/column location.
         *
         * @param aFn The traversal function.
         */
        SourceNode.prototype.walk = function SourceNode_walk(aFn) {
            var chunk;
            for (var i = 0, len = this.children.length; i < len; i++) {
                chunk = this.children[i];
                if (chunk[isSourceNode]) {
                    chunk.walk(aFn);
                } else {
                    if (chunk !== '') {
                        aFn(chunk, { source: this.source,
                            line: this.line,
                            column: this.column,
                            name: this.name });
                    }
                }
            }
        };

        /**
         * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
         * each of `this.children`.
         *
         * @param aSep The separator.
         */
        SourceNode.prototype.join = function SourceNode_join(aSep) {
            var newChildren;
            var i;
            var len = this.children.length;
            if (len > 0) {
                newChildren = [];
                for (i = 0; i < len - 1; i++) {
                    newChildren.push(this.children[i]);
                    newChildren.push(aSep);
                }
                newChildren.push(this.children[i]);
                this.children = newChildren;
            }
            return this;
        };

        /**
         * Call String.prototype.replace on the very right-most source snippet. Useful
         * for trimming whitespace from the end of a source node, etc.
         *
         * @param aPattern The pattern to replace.
         * @param aReplacement The thing to replace the pattern with.
         */
        SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
            var lastChild = this.children[this.children.length - 1];
            if (lastChild[isSourceNode]) {
                lastChild.replaceRight(aPattern, aReplacement);
            } else if (typeof lastChild === 'string') {
                this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
            } else {
                this.children.push(''.replace(aPattern, aReplacement));
            }
            return this;
        };

        /**
         * Set the source content for a source file. This will be added to the SourceMapGenerator
         * in the sourcesContent field.
         *
         * @param aSourceFile The filename of the source file
         * @param aSourceContent The content of the source file
         */
        SourceNode.prototype.setSourceContent = function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
            this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
        };

        /**
         * Walk over the tree of SourceNodes. The walking function is called for each
         * source file content and is passed the filename and source content.
         *
         * @param aFn The traversal function.
         */
        SourceNode.prototype.walkSourceContents = function SourceNode_walkSourceContents(aFn) {
            for (var i = 0, len = this.children.length; i < len; i++) {
                if (this.children[i][isSourceNode]) {
                    this.children[i].walkSourceContents(aFn);
                }
            }

            var sources = Object.keys(this.sourceContents);
            for (var i = 0, len = sources.length; i < len; i++) {
                aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
            }
        };

        /**
         * Return the string representation of this source node. Walks over the tree
         * and concatenates all the various snippets together to one string.
         */
        SourceNode.prototype.toString = function SourceNode_toString() {
            var str = "";
            this.walk(function (chunk) {
                str += chunk;
            });
            return str;
        };

        /**
         * Returns the string representation of this source node along with a source
         * map.
         */
        SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
            var generated = {
                code: "",
                line: 1,
                column: 0
            };
            var map = new SourceMapGenerator(aArgs);
            var sourceMappingActive = false;
            var lastOriginalSource = null;
            var lastOriginalLine = null;
            var lastOriginalColumn = null;
            var lastOriginalName = null;
            this.walk(function (chunk, original) {
                generated.code += chunk;
                if (original.source !== null && original.line !== null && original.column !== null) {
                    if (lastOriginalSource !== original.source || lastOriginalLine !== original.line || lastOriginalColumn !== original.column || lastOriginalName !== original.name) {
                        map.addMapping({
                            source: original.source,
                            original: {
                                line: original.line,
                                column: original.column
                            },
                            generated: {
                                line: generated.line,
                                column: generated.column
                            },
                            name: original.name
                        });
                    }
                    lastOriginalSource = original.source;
                    lastOriginalLine = original.line;
                    lastOriginalColumn = original.column;
                    lastOriginalName = original.name;
                    sourceMappingActive = true;
                } else if (sourceMappingActive) {
                    map.addMapping({
                        generated: {
                            line: generated.line,
                            column: generated.column
                        }
                    });
                    lastOriginalSource = null;
                    sourceMappingActive = false;
                }
                for (var idx = 0, length = chunk.length; idx < length; idx++) {
                    if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
                        generated.line++;
                        generated.column = 0;
                        // Mappings end at eol
                        if (idx + 1 === length) {
                            lastOriginalSource = null;
                            sourceMappingActive = false;
                        } else if (sourceMappingActive) {
                            map.addMapping({
                                source: original.source,
                                original: {
                                    line: original.line,
                                    column: original.column
                                },
                                generated: {
                                    line: generated.line,
                                    column: generated.column
                                },
                                name: original.name
                            });
                        }
                    } else {
                        generated.column++;
                    }
                }
            });
            this.walkSourceContents(function (sourceFile, sourceContent) {
                map.setSourceContent(sourceFile, sourceContent);
            });

            return { code: generated.code, map: map };
        };

        exports.SourceNode = SourceNode;
    }, { "./source-map-generator": 9, "./util": 11 }], 11: [function (require, module, exports) {
        /* -*- Mode: js; js-indent-level: 2; -*- */
        /*
         * Copyright 2011 Mozilla Foundation and contributors
         * Licensed under the New BSD license. See LICENSE or:
         * http://opensource.org/licenses/BSD-3-Clause
         */

        /**
         * This is a helper function for getting values from parameter/options
         * objects.
         *
         * @param args The object we are extracting values from
         * @param name The name of the property we are getting.
         * @param defaultValue An optional value to return if the property is missing
         * from the object. If this is not specified and the property is missing, an
         * error will be thrown.
         */
        function getArg(aArgs, aName, aDefaultValue) {
            if (aName in aArgs) {
                return aArgs[aName];
            } else if (arguments.length === 3) {
                return aDefaultValue;
            } else {
                throw new Error('"' + aName + '" is a required argument.');
            }
        }
        exports.getArg = getArg;

        var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
        var dataUrlRegexp = /^data:.+\,.+$/;

        function urlParse(aUrl) {
            var match = aUrl.match(urlRegexp);
            if (!match) {
                return null;
            }
            return {
                scheme: match[1],
                auth: match[2],
                host: match[3],
                port: match[4],
                path: match[5]
            };
        }
        exports.urlParse = urlParse;

        function urlGenerate(aParsedUrl) {
            var url = '';
            if (aParsedUrl.scheme) {
                url += aParsedUrl.scheme + ':';
            }
            url += '//';
            if (aParsedUrl.auth) {
                url += aParsedUrl.auth + '@';
            }
            if (aParsedUrl.host) {
                url += aParsedUrl.host;
            }
            if (aParsedUrl.port) {
                url += ":" + aParsedUrl.port;
            }
            if (aParsedUrl.path) {
                url += aParsedUrl.path;
            }
            return url;
        }
        exports.urlGenerate = urlGenerate;

        /**
         * Normalizes a path, or the path portion of a URL:
         *
         * - Replaces consecutive slashes with one slash.
         * - Removes unnecessary '.' parts.
         * - Removes unnecessary '<dir>/..' parts.
         *
         * Based on code in the Node.js 'path' core module.
         *
         * @param aPath The path or url to normalize.
         */
        function normalize(aPath) {
            var path = aPath;
            var url = urlParse(aPath);
            if (url) {
                if (!url.path) {
                    return aPath;
                }
                path = url.path;
            }
            var isAbsolute = exports.isAbsolute(path);

            var parts = path.split(/\/+/);
            for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
                part = parts[i];
                if (part === '.') {
                    parts.splice(i, 1);
                } else if (part === '..') {
                    up++;
                } else if (up > 0) {
                    if (part === '') {
                        // The first part is blank if the path is absolute. Trying to go
                        // above the root is a no-op. Therefore we can remove all '..' parts
                        // directly after the root.
                        parts.splice(i + 1, up);
                        up = 0;
                    } else {
                        parts.splice(i, 2);
                        up--;
                    }
                }
            }
            path = parts.join('/');

            if (path === '') {
                path = isAbsolute ? '/' : '.';
            }

            if (url) {
                url.path = path;
                return urlGenerate(url);
            }
            return path;
        }
        exports.normalize = normalize;

        /**
         * Joins two paths/URLs.
         *
         * @param aRoot The root path or URL.
         * @param aPath The path or URL to be joined with the root.
         *
         * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
         *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
         *   first.
         * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
         *   is updated with the result and aRoot is returned. Otherwise the result
         *   is returned.
         *   - If aPath is absolute, the result is aPath.
         *   - Otherwise the two paths are joined with a slash.
         * - Joining for example 'http://' and 'www.example.com' is also supported.
         */
        function join(aRoot, aPath) {
            if (aRoot === "") {
                aRoot = ".";
            }
            if (aPath === "") {
                aPath = ".";
            }
            var aPathUrl = urlParse(aPath);
            var aRootUrl = urlParse(aRoot);
            if (aRootUrl) {
                aRoot = aRootUrl.path || '/';
            }

            // `join(foo, '//www.example.org')`
            if (aPathUrl && !aPathUrl.scheme) {
                if (aRootUrl) {
                    aPathUrl.scheme = aRootUrl.scheme;
                }
                return urlGenerate(aPathUrl);
            }

            if (aPathUrl || aPath.match(dataUrlRegexp)) {
                return aPath;
            }

            // `join('http://', 'www.example.com')`
            if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
                aRootUrl.host = aPath;
                return urlGenerate(aRootUrl);
            }

            var joined = aPath.charAt(0) === '/' ? aPath : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

            if (aRootUrl) {
                aRootUrl.path = joined;
                return urlGenerate(aRootUrl);
            }
            return joined;
        }
        exports.join = join;

        exports.isAbsolute = function (aPath) {
            return aPath.charAt(0) === '/' || urlRegexp.test(aPath);
        };

        /**
         * Make a path relative to a URL or another path.
         *
         * @param aRoot The root path or URL.
         * @param aPath The path or URL to be made relative to aRoot.
         */
        function relative(aRoot, aPath) {
            if (aRoot === "") {
                aRoot = ".";
            }

            aRoot = aRoot.replace(/\/$/, '');

            // It is possible for the path to be above the root. In this case, simply
            // checking whether the root is a prefix of the path won't work. Instead, we
            // need to remove components from the root one by one, until either we find
            // a prefix that fits, or we run out of components to remove.
            var level = 0;
            while (aPath.indexOf(aRoot + '/') !== 0) {
                var index = aRoot.lastIndexOf("/");
                if (index < 0) {
                    return aPath;
                }

                // If the only part of the root that is left is the scheme (i.e. http://,
                // file:///, etc.), one or more slashes (/), or simply nothing at all, we
                // have exhausted all components, so the path is not relative to the root.
                aRoot = aRoot.slice(0, index);
                if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
                    return aPath;
                }

                ++level;
            }

            // Make sure we add a "../" for each component we removed from the root.
            return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
        }
        exports.relative = relative;

        var supportsNullProto = function () {
            var obj = Object.create(null);
            return !('__proto__' in obj);
        }();

        function identity(s) {
            return s;
        }

        /**
         * Because behavior goes wacky when you set `__proto__` on objects, we
         * have to prefix all the strings in our set with an arbitrary character.
         *
         * See https://github.com/mozilla/source-map/pull/31 and
         * https://github.com/mozilla/source-map/issues/30
         *
         * @param String aStr
         */
        function toSetString(aStr) {
            if (isProtoString(aStr)) {
                return '$' + aStr;
            }

            return aStr;
        }
        exports.toSetString = supportsNullProto ? identity : toSetString;

        function fromSetString(aStr) {
            if (isProtoString(aStr)) {
                return aStr.slice(1);
            }

            return aStr;
        }
        exports.fromSetString = supportsNullProto ? identity : fromSetString;

        function isProtoString(s) {
            if (!s) {
                return false;
            }

            var length = s.length;

            if (length < 9 /* "__proto__".length */) {
                    return false;
                }

            if (s.charCodeAt(length - 1) !== 95 /* '_' */ || s.charCodeAt(length - 2) !== 95 /* '_' */ || s.charCodeAt(length - 3) !== 111 /* 'o' */ || s.charCodeAt(length - 4) !== 116 /* 't' */ || s.charCodeAt(length - 5) !== 111 /* 'o' */ || s.charCodeAt(length - 6) !== 114 /* 'r' */ || s.charCodeAt(length - 7) !== 112 /* 'p' */ || s.charCodeAt(length - 8) !== 95 /* '_' */ || s.charCodeAt(length - 9) !== 95 /* '_' */) {
                    return false;
                }

            for (var i = length - 10; i >= 0; i--) {
                if (s.charCodeAt(i) !== 36 /* '$' */) {
                        return false;
                    }
            }

            return true;
        }

        /**
         * Comparator between two mappings where the original positions are compared.
         *
         * Optionally pass in `true` as `onlyCompareGenerated` to consider two
         * mappings with the same original source/line/column, but different generated
         * line and column the same. Useful when searching for a mapping with a
         * stubbed out mapping.
         */
        function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
            var cmp = strcmp(mappingA.source, mappingB.source);
            if (cmp !== 0) {
                return cmp;
            }

            cmp = mappingA.originalLine - mappingB.originalLine;
            if (cmp !== 0) {
                return cmp;
            }

            cmp = mappingA.originalColumn - mappingB.originalColumn;
            if (cmp !== 0 || onlyCompareOriginal) {
                return cmp;
            }

            cmp = mappingA.generatedColumn - mappingB.generatedColumn;
            if (cmp !== 0) {
                return cmp;
            }

            cmp = mappingA.generatedLine - mappingB.generatedLine;
            if (cmp !== 0) {
                return cmp;
            }

            return strcmp(mappingA.name, mappingB.name);
        }
        exports.compareByOriginalPositions = compareByOriginalPositions;

        /**
         * Comparator between two mappings with deflated source and name indices where
         * the generated positions are compared.
         *
         * Optionally pass in `true` as `onlyCompareGenerated` to consider two
         * mappings with the same generated line and column, but different
         * source/name/original line and column the same. Useful when searching for a
         * mapping with a stubbed out mapping.
         */
        function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
            var cmp = mappingA.generatedLine - mappingB.generatedLine;
            if (cmp !== 0) {
                return cmp;
            }

            cmp = mappingA.generatedColumn - mappingB.generatedColumn;
            if (cmp !== 0 || onlyCompareGenerated) {
                return cmp;
            }

            cmp = strcmp(mappingA.source, mappingB.source);
            if (cmp !== 0) {
                return cmp;
            }

            cmp = mappingA.originalLine - mappingB.originalLine;
            if (cmp !== 0) {
                return cmp;
            }

            cmp = mappingA.originalColumn - mappingB.originalColumn;
            if (cmp !== 0) {
                return cmp;
            }

            return strcmp(mappingA.name, mappingB.name);
        }
        exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

        function strcmp(aStr1, aStr2) {
            if (aStr1 === aStr2) {
                return 0;
            }

            if (aStr1 === null) {
                return 1; // aStr2 !== null
            }

            if (aStr2 === null) {
                return -1; // aStr1 !== null
            }

            if (aStr1 > aStr2) {
                return 1;
            }

            return -1;
        }

        /**
         * Comparator between two mappings with inflated source and name strings where
         * the generated positions are compared.
         */
        function compareByGeneratedPositionsInflated(mappingA, mappingB) {
            var cmp = mappingA.generatedLine - mappingB.generatedLine;
            if (cmp !== 0) {
                return cmp;
            }

            cmp = mappingA.generatedColumn - mappingB.generatedColumn;
            if (cmp !== 0) {
                return cmp;
            }

            cmp = strcmp(mappingA.source, mappingB.source);
            if (cmp !== 0) {
                return cmp;
            }

            cmp = mappingA.originalLine - mappingB.originalLine;
            if (cmp !== 0) {
                return cmp;
            }

            cmp = mappingA.originalColumn - mappingB.originalColumn;
            if (cmp !== 0) {
                return cmp;
            }

            return strcmp(mappingA.name, mappingB.name);
        }
        exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

        /**
         * Strip any JSON XSSI avoidance prefix from the string (as documented
         * in the source maps specification), and then parse the string as
         * JSON.
         */
        function parseSourceMapInput(str) {
            return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ''));
        }
        exports.parseSourceMapInput = parseSourceMapInput;

        /**
         * Compute the URL of a source given the the source root, the source's
         * URL, and the source map's URL.
         */
        function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
            sourceURL = sourceURL || '';

            if (sourceRoot) {
                // This follows what Chrome does.
                if (sourceRoot[sourceRoot.length - 1] !== '/' && sourceURL[0] !== '/') {
                    sourceRoot += '/';
                }
                // The spec says:
                //   Line 4: An optional source root, useful for relocating source
                //   files on a server or removing repeated values in the
                //   “sources” entry.  This value is prepended to the individual
                //   entries in the “source” field.
                sourceURL = sourceRoot + sourceURL;
            }

            // Historically, SourceMapConsumer did not take the sourceMapURL as
            // a parameter.  This mode is still somewhat supported, which is why
            // this code block is conditional.  However, it's preferable to pass
            // the source map URL to SourceMapConsumer, so that this function
            // can implement the source URL resolution algorithm as outlined in
            // the spec.  This block is basically the equivalent of:
            //    new URL(sourceURL, sourceMapURL).toString()
            // ... except it avoids using URL, which wasn't available in the
            // older releases of node still supported by this library.
            //
            // The spec says:
            //   If the sources are not absolute URLs after prepending of the
            //   “sourceRoot”, the sources are resolved relative to the
            //   SourceMap (like resolving script src in a html document).
            if (sourceMapURL) {
                var parsed = urlParse(sourceMapURL);
                if (!parsed) {
                    throw new Error("sourceMapURL could not be parsed");
                }
                if (parsed.path) {
                    // Strip the last path component, but keep the "/".
                    var index = parsed.path.lastIndexOf('/');
                    if (index >= 0) {
                        parsed.path = parsed.path.substring(0, index + 1);
                    }
                }
                sourceURL = join(urlGenerate(parsed), sourceURL);
            }

            return normalize(sourceURL);
        }
        exports.computeSourceURL = computeSourceURL;
    }, {}], 12: [function (require, module, exports) {
        /*
         * Copyright 2009-2011 Mozilla Foundation and contributors
         * Licensed under the New BSD license. See LICENSE.txt or:
         * http://opensource.org/licenses/BSD-3-Clause
         */
        exports.SourceMapGenerator = require('./lib/source-map-generator').SourceMapGenerator;
        exports.SourceMapConsumer = require('./lib/source-map-consumer').SourceMapConsumer;
        exports.SourceNode = require('./lib/source-node').SourceNode;
    }, { "./lib/source-map-consumer": 8, "./lib/source-map-generator": 9, "./lib/source-node": 10 }], 13: [function (require, module, exports) {
        module.exports = {
            "_from": "escodegen",
            "_id": "escodegen@1.11.1",
            "_inBundle": false,
            "_integrity": "sha512-JwiqFD9KdGVVpeuRa68yU3zZnBEOcPs0nKW7wZzXky8Z7tffdYUHbe11bPCV5jYlK6DVdKLWLm0f5I/QlL0Kmw==",
            "_location": "/escodegen",
            "_phantomChildren": {},
            "_requested": {
                "type": "tag",
                "registry": true,
                "raw": "escodegen",
                "name": "escodegen",
                "escapedName": "escodegen",
                "rawSpec": "",
                "saveSpec": null,
                "fetchSpec": "latest"
            },
            "_requiredBy": ["#USER", "/"],
            "_resolved": "https://registry.npmjs.org/escodegen/-/escodegen-1.11.1.tgz",
            "_shasum": "c485ff8d6b4cdb89e27f4a856e91f118401ca510",
            "_spec": "escodegen",
            "_where": "/Users/piotrdabkowski/PycharmProjects/Js2Py/js2py",
            "bin": {
                "esgenerate": "./bin/esgenerate.js",
                "escodegen": "./bin/escodegen.js"
            },
            "bugs": {
                "url": "https://github.com/estools/escodegen/issues"
            },
            "bundleDependencies": false,
            "dependencies": {
                "esprima": "^3.1.3",
                "estraverse": "^4.2.0",
                "esutils": "^2.0.2",
                "optionator": "^0.8.1",
                "source-map": "~0.6.1"
            },
            "deprecated": false,
            "description": "ECMAScript code generator",
            "devDependencies": {
                "acorn": "^4.0.4",
                "bluebird": "^3.4.7",
                "bower-registry-client": "^1.0.0",
                "chai": "^3.5.0",
                "commonjs-everywhere": "^0.9.7",
                "gulp": "^3.8.10",
                "gulp-eslint": "^3.0.1",
                "gulp-mocha": "^3.0.1",
                "semver": "^5.1.0"
            },
            "engines": {
                "node": ">=4.0"
            },
            "files": ["LICENSE.BSD", "README.md", "bin", "escodegen.js", "package.json"],
            "homepage": "http://github.com/estools/escodegen",
            "license": "BSD-2-Clause",
            "main": "escodegen.js",
            "maintainers": [{
                "name": "Yusuke Suzuki",
                "email": "utatane.tea@gmail.com",
                "url": "http://github.com/Constellation"
            }],
            "name": "escodegen",
            "optionalDependencies": {
                "source-map": "~0.6.1"
            },
            "repository": {
                "type": "git",
                "url": "git+ssh://git@github.com/estools/escodegen.git"
            },
            "scripts": {
                "build": "cjsify -a path: tools/entry-point.js > escodegen.browser.js",
                "build-min": "cjsify -ma path: tools/entry-point.js > escodegen.browser.min.js",
                "lint": "gulp lint",
                "release": "node tools/release.js",
                "test": "gulp travis",
                "unit-test": "gulp test"
            },
            "version": "1.11.1"
        };
    }, {}], 14: [function (require, module, exports) {
        /*
          Copyright (C) 2012-2013 Yusuke Suzuki <utatane.tea@gmail.com>
          Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>

          Redistribution and use in source and binary forms, with or without
          modification, are permitted provided that the following conditions are met:

            * Redistributions of source code must retain the above copyright
              notice, this list of conditions and the following disclaimer.
            * Redistributions in binary form must reproduce the above copyright
              notice, this list of conditions and the following disclaimer in the
              documentation and/or other materials provided with the distribution.

          THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
          AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
          IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
          ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
          DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
          (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
          LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
          ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
          (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
          THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
        */
        /*jslint vars:false, bitwise:true*/
        /*jshint indent:4*/
        /*global exports:true*/
        (function clone(exports) {
            'use strict';

            var Syntax, isArray, VisitorOption, VisitorKeys, objectCreate, objectKeys, BREAK, SKIP, REMOVE;

            function ignoreJSHintError() {}

            isArray = Array.isArray;
            if (!isArray) {
                isArray = function isArray(array) {
                    return Object.prototype.toString.call(array) === '[object Array]';
                };
            }

            function deepCopy(obj) {
                var ret = {},
                    key,
                    val;
                for (key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        val = obj[key];
                        if ((typeof val === "undefined" ? "undefined" : _typeof(val)) === 'object' && val !== null) {
                            ret[key] = deepCopy(val);
                        } else {
                            ret[key] = val;
                        }
                    }
                }
                return ret;
            }

            function shallowCopy(obj) {
                var ret = {},
                    key;
                for (key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        ret[key] = obj[key];
                    }
                }
                return ret;
            }
            ignoreJSHintError(shallowCopy);

            // based on LLVM libc++ upper_bound / lower_bound
            // MIT License

            function upperBound(array, func) {
                var diff, len, i, current;

                len = array.length;
                i = 0;

                while (len) {
                    diff = len >>> 1;
                    current = i + diff;
                    if (func(array[current])) {
                        len = diff;
                    } else {
                        i = current + 1;
                        len -= diff + 1;
                    }
                }
                return i;
            }

            function lowerBound(array, func) {
                var diff, len, i, current;

                len = array.length;
                i = 0;

                while (len) {
                    diff = len >>> 1;
                    current = i + diff;
                    if (func(array[current])) {
                        i = current + 1;
                        len -= diff + 1;
                    } else {
                        len = diff;
                    }
                }
                return i;
            }
            ignoreJSHintError(lowerBound);

            objectCreate = Object.create || function () {
                function F() {}

                return function (o) {
                    F.prototype = o;
                    return new F();
                };
            }();

            objectKeys = Object.keys || function (o) {
                var keys = [],
                    key;
                for (key in o) {
                    keys.push(key);
                }
                return keys;
            };

            function extend(to, from) {
                var keys = objectKeys(from),
                    key,
                    i,
                    len;
                for (i = 0, len = keys.length; i < len; i += 1) {
                    key = keys[i];
                    to[key] = from[key];
                }
                return to;
            }

            Syntax = {
                AssignmentExpression: 'AssignmentExpression',
                AssignmentPattern: 'AssignmentPattern',
                ArrayExpression: 'ArrayExpression',
                ArrayPattern: 'ArrayPattern',
                ArrowFunctionExpression: 'ArrowFunctionExpression',
                AwaitExpression: 'AwaitExpression', // CAUTION: It's deferred to ES7.
                BlockStatement: 'BlockStatement',
                BinaryExpression: 'BinaryExpression',
                BreakStatement: 'BreakStatement',
                CallExpression: 'CallExpression',
                CatchClause: 'CatchClause',
                ClassBody: 'ClassBody',
                ClassDeclaration: 'ClassDeclaration',
                ClassExpression: 'ClassExpression',
                ComprehensionBlock: 'ComprehensionBlock', // CAUTION: It's deferred to ES7.
                ComprehensionExpression: 'ComprehensionExpression', // CAUTION: It's deferred to ES7.
                ConditionalExpression: 'ConditionalExpression',
                ContinueStatement: 'ContinueStatement',
                DebuggerStatement: 'DebuggerStatement',
                DirectiveStatement: 'DirectiveStatement',
                DoWhileStatement: 'DoWhileStatement',
                EmptyStatement: 'EmptyStatement',
                ExportAllDeclaration: 'ExportAllDeclaration',
                ExportDefaultDeclaration: 'ExportDefaultDeclaration',
                ExportNamedDeclaration: 'ExportNamedDeclaration',
                ExportSpecifier: 'ExportSpecifier',
                ExpressionStatement: 'ExpressionStatement',
                ForStatement: 'ForStatement',
                ForInStatement: 'ForInStatement',
                ForOfStatement: 'ForOfStatement',
                FunctionDeclaration: 'FunctionDeclaration',
                FunctionExpression: 'FunctionExpression',
                GeneratorExpression: 'GeneratorExpression', // CAUTION: It's deferred to ES7.
                Identifier: 'Identifier',
                IfStatement: 'IfStatement',
                ImportDeclaration: 'ImportDeclaration',
                ImportDefaultSpecifier: 'ImportDefaultSpecifier',
                ImportNamespaceSpecifier: 'ImportNamespaceSpecifier',
                ImportSpecifier: 'ImportSpecifier',
                Literal: 'Literal',
                LabeledStatement: 'LabeledStatement',
                LogicalExpression: 'LogicalExpression',
                MemberExpression: 'MemberExpression',
                MetaProperty: 'MetaProperty',
                MethodDefinition: 'MethodDefinition',
                ModuleSpecifier: 'ModuleSpecifier',
                NewExpression: 'NewExpression',
                ObjectExpression: 'ObjectExpression',
                ObjectPattern: 'ObjectPattern',
                Program: 'Program',
                Property: 'Property',
                RestElement: 'RestElement',
                ReturnStatement: 'ReturnStatement',
                SequenceExpression: 'SequenceExpression',
                SpreadElement: 'SpreadElement',
                Super: 'Super',
                SwitchStatement: 'SwitchStatement',
                SwitchCase: 'SwitchCase',
                TaggedTemplateExpression: 'TaggedTemplateExpression',
                TemplateElement: 'TemplateElement',
                TemplateLiteral: 'TemplateLiteral',
                ThisExpression: 'ThisExpression',
                ThrowStatement: 'ThrowStatement',
                TryStatement: 'TryStatement',
                UnaryExpression: 'UnaryExpression',
                UpdateExpression: 'UpdateExpression',
                VariableDeclaration: 'VariableDeclaration',
                VariableDeclarator: 'VariableDeclarator',
                WhileStatement: 'WhileStatement',
                WithStatement: 'WithStatement',
                YieldExpression: 'YieldExpression'
            };

            VisitorKeys = {
                AssignmentExpression: ['left', 'right'],
                AssignmentPattern: ['left', 'right'],
                ArrayExpression: ['elements'],
                ArrayPattern: ['elements'],
                ArrowFunctionExpression: ['params', 'body'],
                AwaitExpression: ['argument'], // CAUTION: It's deferred to ES7.
                BlockStatement: ['body'],
                BinaryExpression: ['left', 'right'],
                BreakStatement: ['label'],
                CallExpression: ['callee', 'arguments'],
                CatchClause: ['param', 'body'],
                ClassBody: ['body'],
                ClassDeclaration: ['id', 'superClass', 'body'],
                ClassExpression: ['id', 'superClass', 'body'],
                ComprehensionBlock: ['left', 'right'], // CAUTION: It's deferred to ES7.
                ComprehensionExpression: ['blocks', 'filter', 'body'], // CAUTION: It's deferred to ES7.
                ConditionalExpression: ['test', 'consequent', 'alternate'],
                ContinueStatement: ['label'],
                DebuggerStatement: [],
                DirectiveStatement: [],
                DoWhileStatement: ['body', 'test'],
                EmptyStatement: [],
                ExportAllDeclaration: ['source'],
                ExportDefaultDeclaration: ['declaration'],
                ExportNamedDeclaration: ['declaration', 'specifiers', 'source'],
                ExportSpecifier: ['exported', 'local'],
                ExpressionStatement: ['expression'],
                ForStatement: ['init', 'test', 'update', 'body'],
                ForInStatement: ['left', 'right', 'body'],
                ForOfStatement: ['left', 'right', 'body'],
                FunctionDeclaration: ['id', 'params', 'body'],
                FunctionExpression: ['id', 'params', 'body'],
                GeneratorExpression: ['blocks', 'filter', 'body'], // CAUTION: It's deferred to ES7.
                Identifier: [],
                IfStatement: ['test', 'consequent', 'alternate'],
                ImportDeclaration: ['specifiers', 'source'],
                ImportDefaultSpecifier: ['local'],
                ImportNamespaceSpecifier: ['local'],
                ImportSpecifier: ['imported', 'local'],
                Literal: [],
                LabeledStatement: ['label', 'body'],
                LogicalExpression: ['left', 'right'],
                MemberExpression: ['object', 'property'],
                MetaProperty: ['meta', 'property'],
                MethodDefinition: ['key', 'value'],
                ModuleSpecifier: [],
                NewExpression: ['callee', 'arguments'],
                ObjectExpression: ['properties'],
                ObjectPattern: ['properties'],
                Program: ['body'],
                Property: ['key', 'value'],
                RestElement: ['argument'],
                ReturnStatement: ['argument'],
                SequenceExpression: ['expressions'],
                SpreadElement: ['argument'],
                Super: [],
                SwitchStatement: ['discriminant', 'cases'],
                SwitchCase: ['test', 'consequent'],
                TaggedTemplateExpression: ['tag', 'quasi'],
                TemplateElement: [],
                TemplateLiteral: ['quasis', 'expressions'],
                ThisExpression: [],
                ThrowStatement: ['argument'],
                TryStatement: ['block', 'handler', 'finalizer'],
                UnaryExpression: ['argument'],
                UpdateExpression: ['argument'],
                VariableDeclaration: ['declarations'],
                VariableDeclarator: ['id', 'init'],
                WhileStatement: ['test', 'body'],
                WithStatement: ['object', 'body'],
                YieldExpression: ['argument']
            };

            // unique id
            BREAK = {};
            SKIP = {};
            REMOVE = {};

            VisitorOption = {
                Break: BREAK,
                Skip: SKIP,
                Remove: REMOVE
            };

            function Reference(parent, key) {
                this.parent = parent;
                this.key = key;
            }

            Reference.prototype.replace = function replace(node) {
                this.parent[this.key] = node;
            };

            Reference.prototype.remove = function remove() {
                if (isArray(this.parent)) {
                    this.parent.splice(this.key, 1);
                    return true;
                } else {
                    this.replace(null);
                    return false;
                }
            };

            function Element(node, path, wrap, ref) {
                this.node = node;
                this.path = path;
                this.wrap = wrap;
                this.ref = ref;
            }

            function Controller() {}

            // API:
            // return property path array from root to current node
            Controller.prototype.path = function path() {
                var i, iz, j, jz, result, element;

                function addToPath(result, path) {
                    if (isArray(path)) {
                        for (j = 0, jz = path.length; j < jz; ++j) {
                            result.push(path[j]);
                        }
                    } else {
                        result.push(path);
                    }
                }

                // root node
                if (!this.__current.path) {
                    return null;
                }

                // first node is sentinel, second node is root element
                result = [];
                for (i = 2, iz = this.__leavelist.length; i < iz; ++i) {
                    element = this.__leavelist[i];
                    addToPath(result, element.path);
                }
                addToPath(result, this.__current.path);
                return result;
            };

            // API:
            // return type of current node
            Controller.prototype.type = function () {
                var node = this.current();
                return node.type || this.__current.wrap;
            };

            // API:
            // return array of parent elements
            Controller.prototype.parents = function parents() {
                var i, iz, result;

                // first node is sentinel
                result = [];
                for (i = 1, iz = this.__leavelist.length; i < iz; ++i) {
                    result.push(this.__leavelist[i].node);
                }

                return result;
            };

            // API:
            // return current node
            Controller.prototype.current = function current() {
                return this.__current.node;
            };

            Controller.prototype.__execute = function __execute(callback, element) {
                var previous, result;

                result = undefined;

                previous = this.__current;
                this.__current = element;
                this.__state = null;
                if (callback) {
                    result = callback.call(this, element.node, this.__leavelist[this.__leavelist.length - 1].node);
                }
                this.__current = previous;

                return result;
            };

            // API:
            // notify control skip / break
            Controller.prototype.notify = function notify(flag) {
                this.__state = flag;
            };

            // API:
            // skip child nodes of current node
            Controller.prototype.skip = function () {
                this.notify(SKIP);
            };

            // API:
            // break traversals
            Controller.prototype['break'] = function () {
                this.notify(BREAK);
            };

            // API:
            // remove node
            Controller.prototype.remove = function () {
                this.notify(REMOVE);
            };

            Controller.prototype.__initialize = function (root, visitor) {
                this.visitor = visitor;
                this.root = root;
                this.__worklist = [];
                this.__leavelist = [];
                this.__current = null;
                this.__state = null;
                this.__fallback = null;
                if (visitor.fallback === 'iteration') {
                    this.__fallback = objectKeys;
                } else if (typeof visitor.fallback === 'function') {
                    this.__fallback = visitor.fallback;
                }

                this.__keys = VisitorKeys;
                if (visitor.keys) {
                    this.__keys = extend(objectCreate(this.__keys), visitor.keys);
                }
            };

            function isNode(node) {
                if (node == null) {
                    return false;
                }
                return (typeof node === "undefined" ? "undefined" : _typeof(node)) === 'object' && typeof node.type === 'string';
            }

            function isProperty(nodeType, key) {
                return (nodeType === Syntax.ObjectExpression || nodeType === Syntax.ObjectPattern) && 'properties' === key;
            }

            Controller.prototype.traverse = function traverse(root, visitor) {
                var worklist, leavelist, element, node, nodeType, ret, key, current, current2, candidates, candidate, sentinel;

                this.__initialize(root, visitor);

                sentinel = {};

                // reference
                worklist = this.__worklist;
                leavelist = this.__leavelist;

                // initialize
                worklist.push(new Element(root, null, null, null));
                leavelist.push(new Element(null, null, null, null));

                while (worklist.length) {
                    element = worklist.pop();

                    if (element === sentinel) {
                        element = leavelist.pop();

                        ret = this.__execute(visitor.leave, element);

                        if (this.__state === BREAK || ret === BREAK) {
                            return;
                        }
                        continue;
                    }

                    if (element.node) {

                        ret = this.__execute(visitor.enter, element);

                        if (this.__state === BREAK || ret === BREAK) {
                            return;
                        }

                        worklist.push(sentinel);
                        leavelist.push(element);

                        if (this.__state === SKIP || ret === SKIP) {
                            continue;
                        }

                        node = element.node;
                        nodeType = node.type || element.wrap;
                        candidates = this.__keys[nodeType];
                        if (!candidates) {
                            if (this.__fallback) {
                                candidates = this.__fallback(node);
                            } else {
                                throw new Error('Unknown node type ' + nodeType + '.');
                            }
                        }

                        current = candidates.length;
                        while ((current -= 1) >= 0) {
                            key = candidates[current];
                            candidate = node[key];
                            if (!candidate) {
                                continue;
                            }

                            if (isArray(candidate)) {
                                current2 = candidate.length;
                                while ((current2 -= 1) >= 0) {
                                    if (!candidate[current2]) {
                                        continue;
                                    }
                                    if (isProperty(nodeType, candidates[current])) {
                                        element = new Element(candidate[current2], [key, current2], 'Property', null);
                                    } else if (isNode(candidate[current2])) {
                                        element = new Element(candidate[current2], [key, current2], null, null);
                                    } else {
                                        continue;
                                    }
                                    worklist.push(element);
                                }
                            } else if (isNode(candidate)) {
                                worklist.push(new Element(candidate, key, null, null));
                            }
                        }
                    }
                }
            };

            Controller.prototype.replace = function replace(root, visitor) {
                var worklist, leavelist, node, nodeType, target, element, current, current2, candidates, candidate, sentinel, outer, key;

                function removeElem(element) {
                    var i, key, nextElem, parent;

                    if (element.ref.remove()) {
                        // When the reference is an element of an array.
                        key = element.ref.key;
                        parent = element.ref.parent;

                        // If removed from array, then decrease following items' keys.
                        i = worklist.length;
                        while (i--) {
                            nextElem = worklist[i];
                            if (nextElem.ref && nextElem.ref.parent === parent) {
                                if (nextElem.ref.key < key) {
                                    break;
                                }
                                --nextElem.ref.key;
                            }
                        }
                    }
                }

                this.__initialize(root, visitor);

                sentinel = {};

                // reference
                worklist = this.__worklist;
                leavelist = this.__leavelist;

                // initialize
                outer = {
                    root: root
                };
                element = new Element(root, null, null, new Reference(outer, 'root'));
                worklist.push(element);
                leavelist.push(element);

                while (worklist.length) {
                    element = worklist.pop();

                    if (element === sentinel) {
                        element = leavelist.pop();

                        target = this.__execute(visitor.leave, element);

                        // node may be replaced with null,
                        // so distinguish between undefined and null in this place
                        if (target !== undefined && target !== BREAK && target !== SKIP && target !== REMOVE) {
                            // replace
                            element.ref.replace(target);
                        }

                        if (this.__state === REMOVE || target === REMOVE) {
                            removeElem(element);
                        }

                        if (this.__state === BREAK || target === BREAK) {
                            return outer.root;
                        }
                        continue;
                    }

                    target = this.__execute(visitor.enter, element);

                    // node may be replaced with null,
                    // so distinguish between undefined and null in this place
                    if (target !== undefined && target !== BREAK && target !== SKIP && target !== REMOVE) {
                        // replace
                        element.ref.replace(target);
                        element.node = target;
                    }

                    if (this.__state === REMOVE || target === REMOVE) {
                        removeElem(element);
                        element.node = null;
                    }

                    if (this.__state === BREAK || target === BREAK) {
                        return outer.root;
                    }

                    // node may be null
                    node = element.node;
                    if (!node) {
                        continue;
                    }

                    worklist.push(sentinel);
                    leavelist.push(element);

                    if (this.__state === SKIP || target === SKIP) {
                        continue;
                    }

                    nodeType = node.type || element.wrap;
                    candidates = this.__keys[nodeType];
                    if (!candidates) {
                        if (this.__fallback) {
                            candidates = this.__fallback(node);
                        } else {
                            throw new Error('Unknown node type ' + nodeType + '.');
                        }
                    }

                    current = candidates.length;
                    while ((current -= 1) >= 0) {
                        key = candidates[current];
                        candidate = node[key];
                        if (!candidate) {
                            continue;
                        }

                        if (isArray(candidate)) {
                            current2 = candidate.length;
                            while ((current2 -= 1) >= 0) {
                                if (!candidate[current2]) {
                                    continue;
                                }
                                if (isProperty(nodeType, candidates[current])) {
                                    element = new Element(candidate[current2], [key, current2], 'Property', new Reference(candidate, current2));
                                } else if (isNode(candidate[current2])) {
                                    element = new Element(candidate[current2], [key, current2], null, new Reference(candidate, current2));
                                } else {
                                    continue;
                                }
                                worklist.push(element);
                            }
                        } else if (isNode(candidate)) {
                            worklist.push(new Element(candidate, key, null, new Reference(node, key)));
                        }
                    }
                }

                return outer.root;
            };

            function traverse(root, visitor) {
                var controller = new Controller();
                return controller.traverse(root, visitor);
            }

            function replace(root, visitor) {
                var controller = new Controller();
                return controller.replace(root, visitor);
            }

            function extendCommentRange(comment, tokens) {
                var target;

                target = upperBound(tokens, function search(token) {
                    return token.range[0] > comment.range[0];
                });

                comment.extendedRange = [comment.range[0], comment.range[1]];

                if (target !== tokens.length) {
                    comment.extendedRange[1] = tokens[target].range[0];
                }

                target -= 1;
                if (target >= 0) {
                    comment.extendedRange[0] = tokens[target].range[1];
                }

                return comment;
            }

            function attachComments(tree, providedComments, tokens) {
                // At first, we should calculate extended comment ranges.
                var comments = [],
                    comment,
                    len,
                    i,
                    cursor;

                if (!tree.range) {
                    throw new Error('attachComments needs range information');
                }

                // tokens array is empty, we attach comments to tree as 'leadingComments'
                if (!tokens.length) {
                    if (providedComments.length) {
                        for (i = 0, len = providedComments.length; i < len; i += 1) {
                            comment = deepCopy(providedComments[i]);
                            comment.extendedRange = [0, tree.range[0]];
                            comments.push(comment);
                        }
                        tree.leadingComments = comments;
                    }
                    return tree;
                }

                for (i = 0, len = providedComments.length; i < len; i += 1) {
                    comments.push(extendCommentRange(deepCopy(providedComments[i]), tokens));
                }

                // This is based on John Freeman's implementation.
                cursor = 0;
                traverse(tree, {
                    enter: function enter(node) {
                        var comment;

                        while (cursor < comments.length) {
                            comment = comments[cursor];
                            if (comment.extendedRange[1] > node.range[0]) {
                                break;
                            }

                            if (comment.extendedRange[1] === node.range[0]) {
                                if (!node.leadingComments) {
                                    node.leadingComments = [];
                                }
                                node.leadingComments.push(comment);
                                comments.splice(cursor, 1);
                            } else {
                                cursor += 1;
                            }
                        }

                        // already out of owned node
                        if (cursor === comments.length) {
                            return VisitorOption.Break;
                        }

                        if (comments[cursor].extendedRange[0] > node.range[1]) {
                            return VisitorOption.Skip;
                        }
                    }
                });

                cursor = 0;
                traverse(tree, {
                    leave: function leave(node) {
                        var comment;

                        while (cursor < comments.length) {
                            comment = comments[cursor];
                            if (node.range[1] < comment.extendedRange[0]) {
                                break;
                            }

                            if (node.range[1] === comment.extendedRange[0]) {
                                if (!node.trailingComments) {
                                    node.trailingComments = [];
                                }
                                node.trailingComments.push(comment);
                                comments.splice(cursor, 1);
                            } else {
                                cursor += 1;
                            }
                        }

                        // already out of owned node
                        if (cursor === comments.length) {
                            return VisitorOption.Break;
                        }

                        if (comments[cursor].extendedRange[0] > node.range[1]) {
                            return VisitorOption.Skip;
                        }
                    }
                });

                return tree;
            }

            exports.version = require('./package.json').version;
            exports.Syntax = Syntax;
            exports.traverse = traverse;
            exports.replace = replace;
            exports.attachComments = attachComments;
            exports.VisitorKeys = VisitorKeys;
            exports.VisitorOption = VisitorOption;
            exports.Controller = Controller;
            exports.cloneEnvironment = function () {
                return clone({});
            };

            return exports;
        })(exports);
        /* vim: set sw=4 ts=4 et tw=80 : */
    }, { "./package.json": 15 }], 15: [function (require, module, exports) {
        module.exports = {
            "_from": "estraverse@^4.2.0",
            "_id": "estraverse@4.2.0",
            "_inBundle": false,
            "_integrity": "sha1-De4/7TH81GlhjOc0IJn8GvoL2xM=",
            "_location": "/estraverse",
            "_phantomChildren": {},
            "_requested": {
                "type": "range",
                "registry": true,
                "raw": "estraverse@^4.2.0",
                "name": "estraverse",
                "escapedName": "estraverse",
                "rawSpec": "^4.2.0",
                "saveSpec": null,
                "fetchSpec": "^4.2.0"
            },
            "_requiredBy": ["/escodegen"],
            "_resolved": "https://registry.npmjs.org/estraverse/-/estraverse-4.2.0.tgz",
            "_shasum": "0dee3fed31fcd469618ce7342099fc1afa0bdb13",
            "_spec": "estraverse@^4.2.0",
            "_where": "/Users/piotrdabkowski/PycharmProjects/Js2Py/js2py/node_modules/escodegen",
            "bugs": {
                "url": "https://github.com/estools/estraverse/issues"
            },
            "bundleDependencies": false,
            "deprecated": false,
            "description": "ECMAScript JS AST traversal functions",
            "devDependencies": {
                "babel-preset-es2015": "^6.3.13",
                "babel-register": "^6.3.13",
                "chai": "^2.1.1",
                "espree": "^1.11.0",
                "gulp": "^3.8.10",
                "gulp-bump": "^0.2.2",
                "gulp-filter": "^2.0.0",
                "gulp-git": "^1.0.1",
                "gulp-tag-version": "^1.2.1",
                "jshint": "^2.5.6",
                "mocha": "^2.1.0"
            },
            "engines": {
                "node": ">=0.10.0"
            },
            "homepage": "https://github.com/estools/estraverse",
            "license": "BSD-2-Clause",
            "main": "estraverse.js",
            "maintainers": [{
                "name": "Yusuke Suzuki",
                "email": "utatane.tea@gmail.com",
                "url": "http://github.com/Constellation"
            }],
            "name": "estraverse",
            "repository": {
                "type": "git",
                "url": "git+ssh://git@github.com/estools/estraverse.git"
            },
            "scripts": {
                "lint": "jshint estraverse.js",
                "test": "npm run-script lint && npm run-script unit-test",
                "unit-test": "mocha --compilers js:babel-register"
            },
            "version": "4.2.0"
        };
    }, {}], 16: [function (require, module, exports) {
        /*
          Copyright (C) 2013 Yusuke Suzuki <utatane.tea@gmail.com>

          Redistribution and use in source and binary forms, with or without
          modification, are permitted provided that the following conditions are met:

            * Redistributions of source code must retain the above copyright
              notice, this list of conditions and the following disclaimer.
            * Redistributions in binary form must reproduce the above copyright
              notice, this list of conditions and the following disclaimer in the
              documentation and/or other materials provided with the distribution.

          THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 'AS IS'
          AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
          IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
          ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
          DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
          (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
          LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
          ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
          (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
          THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
        */

        (function () {
            'use strict';

            function isExpression(node) {
                if (node == null) {
                    return false;
                }
                switch (node.type) {
                    case 'ArrayExpression':
                    case 'AssignmentExpression':
                    case 'BinaryExpression':
                    case 'CallExpression':
                    case 'ConditionalExpression':
                    case 'FunctionExpression':
                    case 'Identifier':
                    case 'Literal':
                    case 'LogicalExpression':
                    case 'MemberExpression':
                    case 'NewExpression':
                    case 'ObjectExpression':
                    case 'SequenceExpression':
                    case 'ThisExpression':
                    case 'UnaryExpression':
                    case 'UpdateExpression':
                        return true;
                }
                return false;
            }

            function isIterationStatement(node) {
                if (node == null) {
                    return false;
                }
                switch (node.type) {
                    case 'DoWhileStatement':
                    case 'ForInStatement':
                    case 'ForStatement':
                    case 'WhileStatement':
                        return true;
                }
                return false;
            }

            function isStatement(node) {
                if (node == null) {
                    return false;
                }
                switch (node.type) {
                    case 'BlockStatement':
                    case 'BreakStatement':
                    case 'ContinueStatement':
                    case 'DebuggerStatement':
                    case 'DoWhileStatement':
                    case 'EmptyStatement':
                    case 'ExpressionStatement':
                    case 'ForInStatement':
                    case 'ForStatement':
                    case 'IfStatement':
                    case 'LabeledStatement':
                    case 'ReturnStatement':
                    case 'SwitchStatement':
                    case 'ThrowStatement':
                    case 'TryStatement':
                    case 'VariableDeclaration':
                    case 'WhileStatement':
                    case 'WithStatement':
                        return true;
                }
                return false;
            }

            function isSourceElement(node) {
                return isStatement(node) || node != null && node.type === 'FunctionDeclaration';
            }

            function trailingStatement(node) {
                switch (node.type) {
                    case 'IfStatement':
                        if (node.alternate != null) {
                            return node.alternate;
                        }
                        return node.consequent;

                    case 'LabeledStatement':
                    case 'ForStatement':
                    case 'ForInStatement':
                    case 'WhileStatement':
                    case 'WithStatement':
                        return node.body;
                }
                return null;
            }

            function isProblematicIfStatement(node) {
                var current;

                if (node.type !== 'IfStatement') {
                    return false;
                }
                if (node.alternate == null) {
                    return false;
                }
                current = node.consequent;
                do {
                    if (current.type === 'IfStatement') {
                        if (current.alternate == null) {
                            return true;
                        }
                    }
                    current = trailingStatement(current);
                } while (current);

                return false;
            }

            module.exports = {
                isExpression: isExpression,
                isStatement: isStatement,
                isIterationStatement: isIterationStatement,
                isSourceElement: isSourceElement,
                isProblematicIfStatement: isProblematicIfStatement,

                trailingStatement: trailingStatement
            };
        })();
        /* vim: set sw=4 ts=4 et tw=80 : */
    }, {}], 17: [function (require, module, exports) {
        /*
          Copyright (C) 2013-2014 Yusuke Suzuki <utatane.tea@gmail.com>
          Copyright (C) 2014 Ivan Nikulin <ifaaan@gmail.com>

          Redistribution and use in source and binary forms, with or without
          modification, are permitted provided that the following conditions are met:

            * Redistributions of source code must retain the above copyright
              notice, this list of conditions and the following disclaimer.
            * Redistributions in binary form must reproduce the above copyright
              notice, this list of conditions and the following disclaimer in the
              documentation and/or other materials provided with the distribution.

          THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
          AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
          IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
          ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
          DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
          (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
          LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
          ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
          (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
          THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
        */

        (function () {
            'use strict';

            var ES6Regex, ES5Regex, NON_ASCII_WHITESPACES, IDENTIFIER_START, IDENTIFIER_PART, ch;

            // See `tools/generate-identifier-regex.js`.
            ES5Regex = {
                // ECMAScript 5.1/Unicode v7.0.0 NonAsciiIdentifierStart:
                NonAsciiIdentifierStart: /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B2\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/,
                // ECMAScript 5.1/Unicode v7.0.0 NonAsciiIdentifierPart:
                NonAsciiIdentifierPart: /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B2\u08E4-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA69D\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2D\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/
            };

            ES6Regex = {
                // ECMAScript 6/Unicode v7.0.0 NonAsciiIdentifierStart:
                NonAsciiIdentifierStart: /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B2\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDE00-\uDE11\uDE13-\uDE2B\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF5D-\uDF61]|\uD805[\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDE00-\uDE2F\uDE44\uDE80-\uDEAA]|\uD806[\uDCA0-\uDCDF\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF98]|\uD809[\uDC00-\uDC6E]|[\uD80C\uD840-\uD868\uD86A-\uD86C][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D]|\uD87E[\uDC00-\uDE1D]/,
                // ECMAScript 6/Unicode v7.0.0 NonAsciiIdentifierPart:
                NonAsciiIdentifierPart: /[\xAA\xB5\xB7\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B2\u08E4-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1369-\u1371\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA69D\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2D\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDD0-\uDDDA\uDE00-\uDE11\uDE13-\uDE37\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF01-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9]|\uD806[\uDCA0-\uDCE9\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF98]|\uD809[\uDC00-\uDC6E]|[\uD80C\uD840-\uD868\uD86A-\uD86C][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/
            };

            function isDecimalDigit(ch) {
                return 0x30 <= ch && ch <= 0x39; // 0..9
            }

            function isHexDigit(ch) {
                return 0x30 <= ch && ch <= 0x39 || // 0..9
                0x61 <= ch && ch <= 0x66 || // a..f
                0x41 <= ch && ch <= 0x46; // A..F
            }

            function isOctalDigit(ch) {
                return ch >= 0x30 && ch <= 0x37; // 0..7
            }

            // 7.2 White Space

            NON_ASCII_WHITESPACES = [0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF];

            function isWhiteSpace(ch) {
                return ch === 0x20 || ch === 0x09 || ch === 0x0B || ch === 0x0C || ch === 0xA0 || ch >= 0x1680 && NON_ASCII_WHITESPACES.indexOf(ch) >= 0;
            }

            // 7.3 Line Terminators

            function isLineTerminator(ch) {
                return ch === 0x0A || ch === 0x0D || ch === 0x2028 || ch === 0x2029;
            }

            // 7.6 Identifier Names and Identifiers

            function fromCodePoint(cp) {
                if (cp <= 0xFFFF) {
                    return String.fromCharCode(cp);
                }
                var cu1 = String.fromCharCode(Math.floor((cp - 0x10000) / 0x400) + 0xD800);
                var cu2 = String.fromCharCode((cp - 0x10000) % 0x400 + 0xDC00);
                return cu1 + cu2;
            }

            IDENTIFIER_START = new Array(0x80);
            for (ch = 0; ch < 0x80; ++ch) {
                IDENTIFIER_START[ch] = ch >= 0x61 && ch <= 0x7A || // a..z
                ch >= 0x41 && ch <= 0x5A || // A..Z
                ch === 0x24 || ch === 0x5F; // $ (dollar) and _ (underscore)
            }

            IDENTIFIER_PART = new Array(0x80);
            for (ch = 0; ch < 0x80; ++ch) {
                IDENTIFIER_PART[ch] = ch >= 0x61 && ch <= 0x7A || // a..z
                ch >= 0x41 && ch <= 0x5A || // A..Z
                ch >= 0x30 && ch <= 0x39 || // 0..9
                ch === 0x24 || ch === 0x5F; // $ (dollar) and _ (underscore)
            }

            function isIdentifierStartES5(ch) {
                return ch < 0x80 ? IDENTIFIER_START[ch] : ES5Regex.NonAsciiIdentifierStart.test(fromCodePoint(ch));
            }

            function isIdentifierPartES5(ch) {
                return ch < 0x80 ? IDENTIFIER_PART[ch] : ES5Regex.NonAsciiIdentifierPart.test(fromCodePoint(ch));
            }

            function isIdentifierStartES6(ch) {
                return ch < 0x80 ? IDENTIFIER_START[ch] : ES6Regex.NonAsciiIdentifierStart.test(fromCodePoint(ch));
            }

            function isIdentifierPartES6(ch) {
                return ch < 0x80 ? IDENTIFIER_PART[ch] : ES6Regex.NonAsciiIdentifierPart.test(fromCodePoint(ch));
            }

            module.exports = {
                isDecimalDigit: isDecimalDigit,
                isHexDigit: isHexDigit,
                isOctalDigit: isOctalDigit,
                isWhiteSpace: isWhiteSpace,
                isLineTerminator: isLineTerminator,
                isIdentifierStartES5: isIdentifierStartES5,
                isIdentifierPartES5: isIdentifierPartES5,
                isIdentifierStartES6: isIdentifierStartES6,
                isIdentifierPartES6: isIdentifierPartES6
            };
        })();
        /* vim: set sw=4 ts=4 et tw=80 : */
    }, {}], 18: [function (require, module, exports) {
        /*
          Copyright (C) 2013 Yusuke Suzuki <utatane.tea@gmail.com>

          Redistribution and use in source and binary forms, with or without
          modification, are permitted provided that the following conditions are met:

            * Redistributions of source code must retain the above copyright
              notice, this list of conditions and the following disclaimer.
            * Redistributions in binary form must reproduce the above copyright
              notice, this list of conditions and the following disclaimer in the
              documentation and/or other materials provided with the distribution.

          THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
          AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
          IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
          ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
          DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
          (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
          LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
          ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
          (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
          THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
        */

        (function () {
            'use strict';

            var code = require('./code');

            function isStrictModeReservedWordES6(id) {
                switch (id) {
                    case 'implements':
                    case 'interface':
                    case 'package':
                    case 'private':
                    case 'protected':
                    case 'public':
                    case 'static':
                    case 'let':
                        return true;
                    default:
                        return false;
                }
            }

            function isKeywordES5(id, strict) {
                // yield should not be treated as keyword under non-strict mode.
                if (!strict && id === 'yield') {
                    return false;
                }
                return isKeywordES6(id, strict);
            }

            function isKeywordES6(id, strict) {
                if (strict && isStrictModeReservedWordES6(id)) {
                    return true;
                }

                switch (id.length) {
                    case 2:
                        return id === 'if' || id === 'in' || id === 'do';
                    case 3:
                        return id === 'var' || id === 'for' || id === 'new' || id === 'try';
                    case 4:
                        return id === 'this' || id === 'else' || id === 'case' || id === 'void' || id === 'with' || id === 'enum';
                    case 5:
                        return id === 'while' || id === 'break' || id === 'catch' || id === 'throw' || id === 'const' || id === 'yield' || id === 'class' || id === 'super';
                    case 6:
                        return id === 'return' || id === 'typeof' || id === 'delete' || id === 'switch' || id === 'export' || id === 'import';
                    case 7:
                        return id === 'default' || id === 'finally' || id === 'extends';
                    case 8:
                        return id === 'function' || id === 'continue' || id === 'debugger';
                    case 10:
                        return id === 'instanceof';
                    default:
                        return false;
                }
            }

            function isReservedWordES5(id, strict) {
                return id === 'null' || id === 'true' || id === 'false' || isKeywordES5(id, strict);
            }

            function isReservedWordES6(id, strict) {
                return id === 'null' || id === 'true' || id === 'false' || isKeywordES6(id, strict);
            }

            function isRestrictedWord(id) {
                return id === 'eval' || id === 'arguments';
            }

            function isIdentifierNameES5(id) {
                var i, iz, ch;

                if (id.length === 0) {
                    return false;
                }

                ch = id.charCodeAt(0);
                if (!code.isIdentifierStartES5(ch)) {
                    return false;
                }

                for (i = 1, iz = id.length; i < iz; ++i) {
                    ch = id.charCodeAt(i);
                    if (!code.isIdentifierPartES5(ch)) {
                        return false;
                    }
                }
                return true;
            }

            function decodeUtf16(lead, trail) {
                return (lead - 0xD800) * 0x400 + (trail - 0xDC00) + 0x10000;
            }

            function isIdentifierNameES6(id) {
                var i, iz, ch, lowCh, check;

                if (id.length === 0) {
                    return false;
                }

                check = code.isIdentifierStartES6;
                for (i = 0, iz = id.length; i < iz; ++i) {
                    ch = id.charCodeAt(i);
                    if (0xD800 <= ch && ch <= 0xDBFF) {
                        ++i;
                        if (i >= iz) {
                            return false;
                        }
                        lowCh = id.charCodeAt(i);
                        if (!(0xDC00 <= lowCh && lowCh <= 0xDFFF)) {
                            return false;
                        }
                        ch = decodeUtf16(ch, lowCh);
                    }
                    if (!check(ch)) {
                        return false;
                    }
                    check = code.isIdentifierPartES6;
                }
                return true;
            }

            function isIdentifierES5(id, strict) {
                return isIdentifierNameES5(id) && !isReservedWordES5(id, strict);
            }

            function isIdentifierES6(id, strict) {
                return isIdentifierNameES6(id) && !isReservedWordES6(id, strict);
            }

            module.exports = {
                isKeywordES5: isKeywordES5,
                isKeywordES6: isKeywordES6,
                isReservedWordES5: isReservedWordES5,
                isReservedWordES6: isReservedWordES6,
                isRestrictedWord: isRestrictedWord,
                isIdentifierNameES5: isIdentifierNameES5,
                isIdentifierNameES6: isIdentifierNameES6,
                isIdentifierES5: isIdentifierES5,
                isIdentifierES6: isIdentifierES6
            };
        })();
        /* vim: set sw=4 ts=4 et tw=80 : */
    }, { "./code": 17 }], 19: [function (require, module, exports) {
        /*
          Copyright (C) 2013 Yusuke Suzuki <utatane.tea@gmail.com>

          Redistribution and use in source and binary forms, with or without
          modification, are permitted provided that the following conditions are met:

            * Redistributions of source code must retain the above copyright
              notice, this list of conditions and the following disclaimer.
            * Redistributions in binary form must reproduce the above copyright
              notice, this list of conditions and the following disclaimer in the
              documentation and/or other materials provided with the distribution.

          THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
          AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
          IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
          ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
          DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
          (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
          LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
          ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
          (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
          THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
        */

        (function () {
            'use strict';

            exports.ast = require('./ast');
            exports.code = require('./code');
            exports.keyword = require('./keyword');
        })();
        /* vim: set sw=4 ts=4 et tw=80 : */
    }, { "./ast": 16, "./code": 17, "./keyword": 18 }], 20: [function (require, module, exports) {

        ;function addToGlobals(name, obj) {
            if (!Object.prototype.hasOwnProperty('_fake_exports')) {
                Object.prototype._fake_exports = {};
            }
            Object.prototype._fake_exports[name] = obj;
        };

        var module_temp_love_python = require('escodegen');
        addToGlobals('escodegen', module_temp_love_python);
    }, { "escodegen": 1 }] }, {}, [20]);
;function getFromGlobals(name) {
    if (!Object.prototype.hasOwnProperty('_fake_exports')) {
        throw Error("Could not find any value named "+name);
    }
    if (Object.prototype._fake_exports.hasOwnProperty(name)) {
        return Object.prototype._fake_exports[name];
    } else {
        throw Error("Could not find any value named "+name);
    }
};

;var escodegen = getFromGlobals('escodegen');escodegen