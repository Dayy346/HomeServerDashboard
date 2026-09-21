from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


OUT = "Mahrosh_Hamid_RBS_Editable_Resume.docx"
BLUE = RGBColor(22, 39, 125)


def font(run, size=10.4, bold=False, italic=False, color=None):
    run.font.name = "Arial"
    run._element.rPr.rFonts.set(qn("w:ascii"), "Arial")
    run._element.rPr.rFonts.set(qn("w:hAnsi"), "Arial")
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = color


def hide_borders(table):
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        node = OxmlElement(f"w:{edge}")
        node.set(qn("w:val"), "nil")
        borders.append(node)
    table._tbl.tblPr.append(borders)


def cell_margins(cell):
    tc_mar = OxmlElement("w:tcMar")
    for side in ("top", "start", "bottom", "end"):
        node = OxmlElement(f"w:{side}")
        node.set(qn("w:w"), "0")
        node.set(qn("w:type"), "dxa")
        tc_mar.append(node)
    cell._tc.get_or_add_tcPr().append(tc_mar)


def add_rule(paragraph):
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "5")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "16277D")
    borders.append(bottom)
    paragraph._p.get_or_add_pPr().append(borders)


def section(doc, title):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(title.upper())
    font(r, 12.5, color=BLUE)
    add_rule(p)


def two_col(doc, left, right, left_bold=True):
    table = doc.add_table(rows=1, cols=2)
    table.autofit = False
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.columns[0].width = Inches(5.1)
    table.columns[1].width = Inches(2.3)
    hide_borders(table)
    for cell in table.rows[0].cells:
        cell_margins(cell)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
    p1 = table.cell(0, 0).paragraphs[0]
    p1.paragraph_format.space_after = Pt(0)
    font(p1.add_run(left), 10.4, bold=left_bold)
    p2 = table.cell(0, 1).paragraphs[0]
    p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p2.paragraph_format.space_after = Pt(0)
    font(p2.add_run(right), 10.4)


def subtitle(doc, value):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.1)
    p.paragraph_format.space_after = Pt(2)
    font(p.add_run(value), 9.8, italic=True)


def bullet(doc, value):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.2)
    p.paragraph_format.first_line_indent = Inches(-0.14)
    p.paragraph_format.space_after = Pt(2.2)
    p.paragraph_format.line_spacing = 1.08
    font(p.add_run("• " + value), 10.2)


doc = Document()
sec = doc.sections[0]
sec.top_margin = Inches(0.38)
sec.bottom_margin = Inches(0.38)
sec.left_margin = Inches(0.55)
sec.right_margin = Inches(0.55)
style = doc.styles["Normal"]
style.font.name = "Arial"
style._element.rPr.rFonts.set(qn("w:ascii"), "Arial")
style._element.rPr.rFonts.set(qn("w:hAnsi"), "Arial")
style.font.size = Pt(10.4)

header = doc.add_table(rows=1, cols=3)
header.autofit = False
header.alignment = WD_TABLE_ALIGNMENT.CENTER
for cell in header.rows[0].cells:
    cell_margins(cell)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
hide_borders(header)
header.columns[0].width = Inches(2.05)
header.columns[1].width = Inches(3.25)
header.columns[2].width = Inches(2.1)

p = header.cell(0, 0).paragraphs[0]
p.paragraph_format.space_after = Pt(0)
font(p.add_run("Robbinsville, NJ\n609 977 3443\n"), 10.2)
font(p.add_run("hamidmahrosh@gmail.com"), 10.2, color=BLUE)
p = header.cell(0, 1).paragraphs[0]
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(0)
font(p.add_run("Mahrosh Hamid\n"), 20, bold=True)
font(p.add_run("Biomedical Engineering Student"), 12.5, color=BLUE)
p = header.cell(0, 2).paragraphs[0]
p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
p.paragraph_format.space_after = Pt(0)
font(p.add_run("Rutgers University\nNew Brunswick, NJ"), 10.2, color=BLUE)

section(doc, "Profile")
p = doc.add_paragraph()
p.paragraph_format.space_after = Pt(2)
p.paragraph_format.line_spacing = 1.08
font(p.add_run("Biomedical engineering student with experience in teaching, community outreach, event promotion, and entrepreneurship. Brings organized communication, leadership, and a service focused approach to each role."), 10.1)

section(doc, "Education")
two_col(doc, "Rutgers University, New Brunswick, NJ", "Current Student")
subtitle(doc, "Biomedical Engineering")
two_col(doc, "Robbinsville High School, Robbinsville, NJ", "June 2026")
subtitle(doc, "High School Diploma")

section(doc, "Experience")
two_col(doc, "Muslim Center of Greater Princeton, Islamic Teacher", "September 2023 to Present")
bullet(doc, "Teach Islamic history and core principles to a class of 25 or more students ages seven and eight.")
bullet(doc, "Completed more than 400 hours of community service through teaching and community programming.")
two_col(doc, "Biskidi Mendhi, Founder and Henna Artist", "2024 to Present")
bullet(doc, "Launched a henna business and provided custom designs at five events, earning more than $50 per event.")
bullet(doc, "Manage client communication, custom design requests, and pricing based on design complexity.")
two_col(doc, "Muslim Student Association, Social Media and Outreach Coordinator", "September 2025 to June 2026")
bullet(doc, "Created promotional posters and social media posts to share club events with students and the local community.")
bullet(doc, "Coordinated outreach with local Muslim Student Associations, sponsors, and caterers.")
two_col(doc, "Luv Michael Nonprofit Company, Community Service Volunteer", "March 2025 to April 2025")
bullet(doc, "Supported an autism awareness campaign by contacting local representatives and researching resource centers.")
bullet(doc, "Raised more than $200 and completed 40 hours of community service.")
two_col(doc, "Muslim Center of Greater Princeton Free Clinic, Refugee Tutor and Volunteer", "March 2025 to April 2025")
bullet(doc, "Collaborated with a clinical therapist and social work director to develop math and English lessons for Afghan refugee students from prekindergarten through eighth grade.")
bullet(doc, "Completed 40 hours of community service through tutoring and lesson development.")

section(doc, "Honors and Leadership")
bullet(doc, "Princeton University IgniteSTEM, second place winner, Urban Utopia Design Challenge, Fall 2024")
bullet(doc, "Member, World Language Honor Society and National Honor Society, Robbinsville High School")

section(doc, "Skills and Languages")
two_col(doc, "Skills", "Team leadership, strategic thinking, marketing, team engagement", left_bold=True)
two_col(doc, "Languages", "Urdu, native proficiency  |  English, native proficiency  |  Spanish", left_bold=True)

doc.save(OUT)
print(OUT)
