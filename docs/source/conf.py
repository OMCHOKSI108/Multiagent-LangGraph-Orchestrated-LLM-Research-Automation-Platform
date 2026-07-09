import os
import sys

sys.path.insert(0, os.path.abspath('../../server/fastapi_server'))

project = 'Multiagent Research Automation Platform'
copyright = '2026, Multiagent Research Team'
author = 'Multiagent Research Team'
release = '2.0.0'

extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.napoleon',
    'sphinx.ext.viewcode',
    'sphinx.ext.intersphinx',
    'sphinx_rtd_theme',
]

intersphinx_mapping = {
    'python': ('https://docs.python.org/3', None),
}

templates_path = ['_templates']
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

language = 'en'

html_theme = 'sphinx_rtd_theme'
html_static_path = ['_static']
html_css_files = ['custom.css']

html_theme_options = {
    'collapse_navigation': False,
    'sticky_navigation': True,
    'navigation_depth': 4,
}

html_context = {
    'display_github': True,
    'github_user': 'omchoksi',
    'github_repo': 'Multiagent-LangGraph-Orchestrated-LLM-Research-Automation-Platform',
    'github_version': 'main',
    'conf_py_path': '/docs/source/',
}
