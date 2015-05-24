__all__ = ['PyJsParser', 'Node', 'WrappingNode', 'node_to_dict', 'parse']
__author__ = 'Piotr Dabkowski'
__version__ = '2.2.0'
from pyjsparser import PyJsParser, Node, WrappingNode, node_to_dict

def parse(javascript_code):
    """Returns syntax tree of javascript_code.
       Same as PyJsParser().parse  For your convenience :) """
    p = PyJsParser()
    return p.parse(javascript_code)