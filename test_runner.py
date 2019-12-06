import pytest
import codecs
import os
import sys

import pyjsparser
import js2py

PY3 = sys.version_info >= (3, 0)

if PY3:
    basestring = str
    long = int

expand_path = lambda path: os.path.join(os.path.dirname(__file__), path)
PASSING_DIR = expand_path("tests/pass")
REFERENCE_ESPRIMA_PATH = expand_path('tests/reference_esprima.js')
REFERENCE_ESCODEGEN_PATH = expand_path('tests/reference_escodegen.js')

PASSING_TEST_CASES = [
    os.path.join(PASSING_DIR, e) for e in os.listdir(PASSING_DIR)
]


def get_reference_parse_fn():
    # lets use js2py translated esprima for similicity.
    import js2py
    _, ctx = js2py.run_file(REFERENCE_ESPRIMA_PATH)
    return lambda x: ctx.esprima.parse(x).to_dict()


def get_reference_escodegen_fn():
    # lets use js2py translated escodegen for similicity.
    import js2py
    _, ctx = js2py.run_file(REFERENCE_ESCODEGEN_PATH)
    return lambda x: ctx.escodegen.generate(x)


def get_js_code(path):
    with codecs.open(path, "r", "utf-8") as f:
        return f.read()


known_unsupported = set([
    'TemplateLiteral', 'TemplateElement', 'ForOfStatement', 'RestElement',
    'ArrowFunctionExpression', 'ClassDeclaration', 'ClassBody',
    'SpreadElement', 'YieldExpression', 'MetaProperty', 'Super',
    'ClassExpression', 'TaggedTemplateExpression', 'AssignmentPattern',
    'ArrayPattern', 'ObjectPattern'
])

per_type_support_rules = {
    "FunctionExpression":
    lambda ast: not ast['generator'],
    "FunctionDeclaration":
    lambda ast: not ast['generator'],
    "Property":
    lambda ast: not ast['method'],
    "Identifier":
    lambda ast: pyjsparser.pyjsparserdata.isValidIdentifier(ast['name']),
    "BinaryExpression":
    lambda ast: ast['operator'] != '**',
    "AssignmentExpression":
    lambda ast: ast['operator'] != '**=',
}


def get_unsupported_features(ast):
    unsupported = []
    if isinstance(ast, list):
        for value in ast:
            unsupported.extend(get_unsupported_features(value))
    elif isinstance(ast, dict):
        for key, value in ast.items():
            if key == 'type':
                if value in known_unsupported:
                    unsupported.append(value)
                else:
                    assert value in pyjsparser.pyjsparserdata.supported_syntax
                    if not per_type_support_rules.get(value,
                                                      lambda x: True)(ast):
                        unsupported.append(value + 'Special')
            elif isinstance(value, (dict, list)):
                unsupported.extend(get_unsupported_features(value))
            else:
                assert value is None or isinstance(
                    value, (basestring, bool, float, int,
                            js2py.base.JsObjectWrapper, tuple, long))
    else:
        assert ast is None
    return unsupported


parse_fn = pyjsparser.parse
reference_parse_fn = get_reference_parse_fn()
escodegen_fn = get_reference_escodegen_fn()


def test_fails_on_rubbish():
    old_val = pyjsparser.parser.ENABLE_JS2PY_ERRORS
    pyjsparser.parser.ENABLE_JS2PY_ERRORS = False
    with pytest.raises(pyjsparser.JsSyntaxError):
        parse_fn('rubbish rubbish')
    pyjsparser.parser.ENABLE_JS2PY_ERRORS = old_val


@pytest.mark.parametrize('path',
                         [REFERENCE_ESPRIMA_PATH, REFERENCE_ESCODEGEN_PATH])
def test_parses_known_files(path):
    ast = parse_fn(get_js_code(path))
    assert not set(
        get_unsupported_features(ast)
    ), "These files are known to be ECMA 5.1 compliant so they must be supported."


@pytest.mark.parametrize('js_test_path', PASSING_TEST_CASES)
def test_parses_ecma51(js_test_path):
    # test if we even manage to parse the valid files without errors (with expected errors on unsupported js 6).
    code = get_js_code(js_test_path)
    expected_ast = reference_parse_fn(code)
    unsupported_features = set(get_unsupported_features(expected_ast))
    if unsupported_features:
        # the syntax is not a part of ECMA 5.1 and is known to be unsupported, check that we fail gracefully
        try:
            parse_fn(code)
        except Exception as e:
            assert 'not supported by ECMA 5.1' in str(
                e) or 'SyntaxError' in str(e)
            pytest.skip('Not supported in ECMA 5.1: %s' % repr(
                list(unsupported_features)))
            return
    # At this point the code is known to be ECMA 5.1 so it must parse successfully.
    assert isinstance(parse_fn(code), dict)


@pytest.mark.parametrize('js_test_path', PASSING_TEST_CASES)
def test_ast_to_code(js_test_path):
    # Check if the generated ast allows to restore the original code. This basically ensures that the
    # generated ast is correct.
    code = get_js_code(js_test_path)
    expected_ast = reference_parse_fn(code)
    if get_unsupported_features(expected_ast):
        pytest.skip('Not supported in ECMA 5.1')
        return
    try:
        expected_restored_code = escodegen_fn(expected_ast)
    except:
        pytest.skip('Some weird escodegen error...')
        return
    actual_restored_code = escodegen_fn(parse_fn(code))
    assert actual_restored_code.rstrip(
        '\n ;') == expected_restored_code.rstrip('\n ;')


@pytest.mark.parametrize('js_test_path,typ_expected,value_expected', [
    ('number.js', int, 48992),
    ('float.js', float, 48992.1),
])
def test_parse_number(js_test_path, typ_expected, value_expected):
    js_test_path = os.path.join(PASSING_DIR, js_test_path)
    code = get_js_code(js_test_path)
    result = pyjsparser.PyJsParser().parse(code)
    value = result['body'][0]['expression']['right']['properties'][0]['value']['value']
    assert value == value_expected
    assert isinstance(value, typ_expected)
