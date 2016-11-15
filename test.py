import pyjsparser
import pyjsparser.parser

# simple parsing
assert pyjsparser.parse('var i;+9') == {'body': [{'kind': 'var', 'declarations': [{'init': None, 'type': u'VariableDeclarator', 'id': {'type': u'Identifier', 'name': u'i'}}], 'type': u'VariableDeclaration'}, {'type': u'ExpressionStatement', 'expression': {'operator': u'+', 'prefix': True, 'type': u'UnaryExpression', 'argument': {'raw': None, 'type': u'Literal', 'value': 9.0}}}], 'type': u'Program'}

# errors
try:
    pyjsparser.parse('$ = ---')
except pyjsparser.JsSyntaxError:
    pass
except:
    raise Exception('Invalid error - should be JsSyntaxError')

pyjsparser.parser.ENABLE_JS2PY_ERRORS = True
try:
    pyjsparser.parse('$ = ---')
except pyjsparser.JsSyntaxError:
    raise Exception('Invalid error - should NOT be JsSyntaxError')
except:
    pass


# pyimport
pyjsparser.parser.ENABLE_JS2PY_ERRORS = False
try:
    assert not pyjsparser.parse('pyimport abc')
except pyjsparser.JsSyntaxError:
    pass

pyjsparser.parser.ENABLE_PYIMPORT = True
assert pyjsparser.parse('pyimport abc')

