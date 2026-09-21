from reportlab.lib.colors import HexColor, black
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether


OUT = "Mahrosh_Hamid_RBS_Resume.pdf"
BLUE = HexColor("#16277D")
PAGE_W, PAGE_H = letter
LEFT = 0.52 * inch
RIGHT = 0.52 * inch
WIDTH = PAGE_W - LEFT - RIGHT

base = ParagraphStyle(
    "base", fontName="Helvetica", fontSize=10.4, leading=14.1, textColor=black,
)
small = ParagraphStyle(
    "small", parent=base, fontSize=9.8, leading=13.0,
)
body = ParagraphStyle(
    "body", parent=base, leftIndent=14, firstLineIndent=-11, spaceAfter=2.8,
)
entry_left = ParagraphStyle(
    "entry_left", parent=base, fontName="Helvetica-Bold", leading=13.3,
)
entry_right = ParagraphStyle(
    "entry_right", parent=base, fontName="Helvetica", alignment=2, leading=13.3,
)
sub = ParagraphStyle(
    "sub", parent=small, fontName="Helvetica-Oblique", leading=12.8,
)
section = ParagraphStyle(
    "section", parent=base, fontName="Helvetica", fontSize=12.5, leading=16.5,
    textColor=BLUE, spaceBefore=10, spaceAfter=3,
)


def p(text, style=base):
    return Paragraph(text, style)


def section_heading(title):
    row = Table([[p(title.upper(), section)]], colWidths=[WIDTH], hAlign="LEFT")
    row.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 0.55, BLUE),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return row


def heading_row(left, right):
    table = Table([[p(left, entry_left), p(right, entry_right)]], colWidths=[5.1 * inch, WIDTH - 5.1 * inch])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return table


def experience(name, dates, bullets):
    items = [heading_row(name, dates)]
    for item in bullets:
        items.append(p("• " + item, body))
    items.append(Spacer(1, 5))
    return KeepTogether(items)


doc = SimpleDocTemplate(
    OUT, pagesize=letter, leftMargin=LEFT, rightMargin=RIGHT,
    topMargin=0.35 * inch, bottomMargin=0.36 * inch,
)
story = []

header = Table(
    [[p("Robbinsville, NJ<br/>609 977 3443<br/><font color='#16277D'>hamidmahrosh@gmail.com</font>", base),
      p("<b><font size='22'>Mahrosh Hamid</font></b><br/><font color='#16277D' size='13'>Biomedical Engineering Student</font>", ParagraphStyle("center", parent=base, alignment=1, leading=18)),
      p("<font color='#16277D'>Rutgers University<br/>New Brunswick, NJ</font>", ParagraphStyle("right", parent=base, alignment=2))]],
    colWidths=[1.75 * inch, 3.6 * inch, WIDTH - 5.35 * inch],
)
header.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ("TOPPADDING", (0, 0), (-1, -1), 0),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
]))
story.append(header)

story.append(section_heading("Profile"))
story.append(p("Biomedical engineering student with experience in teaching, community outreach, event promotion, and entrepreneurship. Brings organized communication, leadership, and a service focused approach to each role.", small))

story.append(section_heading("Education"))
story.append(heading_row("Rutgers University, New Brunswick, NJ", "Current Student"))
story.append(p("Biomedical Engineering", sub))
story.append(heading_row("Robbinsville High School, Robbinsville, NJ", "June 2026"))
story.append(p("High School Diploma", sub))

story.append(section_heading("Experience"))
story.append(experience("Muslim Center of Greater Princeton, Islamic Teacher", "September 2023 to Present", [
    "Teach Islamic history and core principles to a class of 25 or more students ages seven and eight.",
    "Completed more than 400 hours of community service through teaching and community programming.",
]))
story.append(experience("Biskidi Mendhi, Founder and Henna Artist", "2024 to Present", [
    "Launched a henna business and provided custom designs at five events, earning more than $50 per event.",
    "Manage client communication, custom design requests, and pricing based on design complexity.",
]))
story.append(experience("Muslim Student Association, Social Media and Outreach Coordinator", "September 2025 to June 2026", [
    "Created promotional posters and social media posts to share club events with students and the local community.",
    "Coordinated outreach with local Muslim Student Associations, sponsors, and caterers.",
]))
story.append(experience("Luv Michael Nonprofit Company, Community Service Volunteer", "March 2025 to April 2025", [
    "Supported an autism awareness campaign by contacting local representatives and researching resource centers.",
    "Raised more than $200 and completed 40 hours of community service.",
]))
story.append(experience("Muslim Center of Greater Princeton Free Clinic, Refugee Tutor and Volunteer", "March 2025 to April 2025", [
    "Collaborated with a clinical therapist and social work director to develop math and English lessons for Afghan refugee students from prekindergarten through eighth grade.",
    "Completed 40 hours of community service through tutoring and lesson development.",
]))

story.append(section_heading("Honors and Leadership"))
story.append(p("• Princeton University IgniteSTEM, second place winner, Urban Utopia Design Challenge, Fall 2024", body))
story.append(p("• Member, World Language Honor Society and National Honor Society, Robbinsville High School", body))

story.append(section_heading("Skills and Languages"))
skills = Table([
    [p("<b>Skills</b>", small), p("Team leadership, strategic thinking, marketing, team engagement", small)],
    [p("<b>Languages</b>", small), p("Urdu, native proficiency   |   English, native proficiency   |   Spanish", small)],
], colWidths=[1.15 * inch, WIDTH - 1.15 * inch])
skills.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ("TOPPADDING", (0, 0), (-1, -1), 1),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
]))
story.append(skills)

doc.build(story)
print(OUT)
