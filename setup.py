try:
    from setuptools import setup
except ImportError:
    from distutils.core import setup

setup(
    name='pyjsparser',
    version='2.7.1',
    packages=['pyjsparser'],
    url='https://github.com/PiotrDabkowski/pyjsparser',
    install_requires=[],
    license='MIT',
    author='Piotr Dabkowski',
    author_email='piodrus@gmail.com',
    description='Fast javascript parser (based on esprima.js)')
