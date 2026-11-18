from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.style import WD_STYLE_TYPE

OUT = r'C:\Users\ellan\OneDrive\Desktop\TeamUp\TeamUp_Project_Report.docx'

doc = Document()
section = doc.sections[0]
section.page_width = Inches(8.5)
section.page_height = Inches(11)
section.top_margin = Inches(.78)
section.bottom_margin = Inches(.72)
section.left_margin = Inches(.86)
section.right_margin = Inches(.86)

styles = doc.styles
normal = styles['Normal']
normal.font.name = 'Aptos'
normal.font.size = Pt(10.5)
normal.font.color.rgb = RGBColor(35, 41, 48)
normal.paragraph_format.space_after = Pt(7)
normal.paragraph_format.line_spacing = 1.14
for name, size, before, after in [('Title', 23, 0, 12), ('Heading 1', 14, 17, 7), ('Heading 2', 11.5, 11, 5)]:
    s = styles[name]
    s.font.name = 'Aptos Display' if name == 'Title' else 'Aptos'
    s.font.size = Pt(size)
    s.font.bold = True
    s.font.color.rgb = RGBColor(0, 0, 0)
    s.paragraph_format.space_before = Pt(before)
    s.paragraph_format.space_after = Pt(after)
    s.paragraph_format.keep_with_next = True
if 'Small Note' not in styles:
    s = styles.add_style('Small Note', WD_STYLE_TYPE.PARAGRAPH)
    s.font.name = 'Aptos'
    s.font.size = Pt(9)
    s.font.color.rgb = RGBColor(88, 94, 103)
    s.paragraph_format.space_after = Pt(7)

def p(text='', style=None):
    return doc.add_paragraph(text, style)

def heading(text, level=1):
    doc.add_heading(text, level)

def bullet(text):
    x = p(text, 'List Bullet')
    x.paragraph_format.space_after = Pt(4)

def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), fill)
    tcPr.append(shd)

def borders(cell):
    tcPr = cell._tc.get_or_add_tcPr()
    b = OxmlElement('w:tcBorders')
    for edge in ['top','left','bottom','right']:
        e = OxmlElement('w:'+edge)
        e.set(qn('w:val'), 'single')
        e.set(qn('w:sz'), '5')
        e.set(qn('w:color'), 'D9D9D9')
        b.append(e)
    tcPr.append(b)

def table(headers, rows, widths):
    t = doc.add_table(rows=1, cols=len(headers))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    for i, width in enumerate(widths):
        t.columns[i].width = Inches(width)
    for i, label in enumerate(headers):
        c = t.rows[0].cells[i]
        c.text = label
        c.width = Inches(widths[i])
        shade(c, '23384F')
        for run in c.paragraphs[0].runs:
            run.font.bold = True
            run.font.color.rgb = RGBColor(255,255,255)
            run.font.size = Pt(9)
    for ri, row in enumerate(rows):
        cells = t.add_row().cells
        for i, value in enumerate(row):
            cells[i].text = value
            cells[i].width = Inches(widths[i])
            if ri % 2:
                shade(cells[i], 'F3F6F9')
    for row in t.rows:
        for c in row.cells:
            c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            borders(c)
            mar = OxmlElement('w:tcMar')
            for side in ['top','start','bottom','end']:
                v = OxmlElement('w:'+side)
                v.set(qn('w:w'), '90')
                v.set(qn('w:type'), 'dxa')
                mar.append(v)
            c._tc.get_or_add_tcPr().append(mar)
            for para in c.paragraphs:
                para.paragraph_format.space_after = Pt(0)
                para.paragraph_format.line_spacing = 1.08
                for run in para.runs:
                    run.font.size = Pt(9)
    doc.add_paragraph().paragraph_format.space_after = Pt(1)

doc.add_paragraph('TeamUp Project Report', 'Title')
p('Campus project collaboration platform for verified SRMIST Kattankulathur students', 'Small Note')
p('TeamUp helps students discover projects and teammates, form teams through applications or invitations, and coordinate work in a private team space. This report describes the features and implementation visible in the project source, along with the steps needed to configure and verify the application.')

heading('Project overview')
p('Students often need a central place to find suitable collaborators and manage group work. TeamUp brings project discovery, skill matching, membership decisions, messaging, tasks, and notifications into one application. Access is restricted to confirmed accounts using an approved campus email domain.')

heading('Objectives')
for x in [
    'Let verified students create profiles that describe skills, interests, availability, and project preferences.',
    'Help students find open projects and discover potential teammates through filters and a rule based skill score.',
    'Make team formation explicit through join requests and owner invitations, with capacity checks at acceptance.',
    'Give project members a private workspace for chat, task assignment, deadlines, and progress tracking.'
]: bullet(x)

heading('Technology and architecture')
table(['Layer','Implementation','Responsibility'], [
    ('Web application','Next.js 16, React 19, TypeScript','Routes, pages, components, and server actions'),
    ('Validation','Zod','Checks profile, project, and request input'),
    ('Backend services','Supabase Auth, PostgreSQL, Storage','Identity, application data, and avatars'),
    ('Access control','PostgreSQL row level security and database functions','Campus gate, ownership, membership, and transactional decisions'),
], [1.24,2.24,3.30])
p('The browser uses Supabase through the application, while server actions handle form submissions and route updates. Database functions process applications and invitations under a transaction so membership and notification changes are coordinated.')

heading('Main user workflows')
heading('Account and profile',2)
p('A student registers with an approved campus email address, confirms the email, and signs in. The student can then edit a profile with academic details, skills, interests, availability, links, and an avatar. A discoverability setting controls whether the profile appears in teammate search.')
heading('Projects and team formation',2)
p('A project owner enters a title, description, category, type, required skills and roles, team size, and optional schedule details. Other students can browse and filter projects, compare their skills with the listed requirements, and submit a join request with a message. Owners accept or reject requests. Owners can also invite discoverable students; invitees accept or decline from their notifications. The owner is included in team capacity.')
heading('Team workspace',2)
p('Accepted members can open a member only workspace, send messages, and work with project tasks. Tasks can have an assignee and deadline and move among To Do, In Progress, and Completed. Assignment events create notifications. The dashboard summarizes project, team, and request activity and shows upcoming task deadlines.')

heading('Skill matching')
p('The app normalizes skill names and compares a student’s skills against the project’s distinct required skills. The displayed match percentage is the number of matching required skills divided by the number of required skills, rounded to a whole percentage. A project with no required skills receives a 100 percent score. Ranking adds a small bonus when the student is marked Available; this is a rule based suggestion, not an AI prediction.')

heading('Data model')
table(['Table','Purpose'], [
    ('profiles','Student identity, academic information, skills, availability, and discoverability'),
    ('projects','Project details, owner, status, requirements, and maximum team size'),
    ('project_members','Project membership and the owner’s Leader role'),
    ('join_requests and team_invitations','Two routes to joining a project, with decision status'),
    ('team_messages and project_tasks','Member conversation and assigned work'),
    ('notifications','Recipient specific alerts and read state'),
], [2.44,4.34])
p('The database creates a profile when an Auth user is created and adds the owner as a project member when a project is created. Project types include PBL, Minor, Major, Hackathon, Research, Technical Competition, and Other.')

heading('Security and access rules')
for x in [
    'The campus gate checks for a confirmed email at the approved srmist.edu.in domain. Server checks and database policies both enforce the requirement.',
    'Row level security limits profile changes to the account owner, project changes to the project owner, and notifications to their recipient.',
    'Team messages and tasks are visible only to members. Task creation and assignment require membership; permitted users can change task status.',
    'Database functions validate project status, membership, pending decisions, and remaining team capacity before accepting applications or invitations.',
    'Avatar files are stored in a private bucket, with writes restricted to the account’s own path.'
]: bullet(x)

heading('Local setup')
p('Install dependencies, copy .env.example to .env.local, and set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL, and APPROVED_EMAIL_DOMAINS. For local use, the site URL is http://localhost:3000 and the approved domain is srmist.edu.in. Run the four SQL migrations in numerical order in the Supabase SQL Editor. Configure the Auth site URL and /auth/callback redirect, and enable email confirmation. Then start the app with npm.cmd run dev.')
p('The published Supabase key is intended for browser access. A service role key must never be placed in a NEXT_PUBLIC variable.', 'Small Note')

heading('Verification status and next checks')
p('The repository README reports that TypeScript checking and a production build passed locally. It also states that live Supabase flows and row level security were not tested in that workspace because database credentials and two confirmed demo accounts were unavailable. This report does not treat those live flows as verified.')
p('A useful acceptance walkthrough uses two confirmed campus accounts: create a project as Student A, apply as Student B, accept the request, confirm that the team becomes full at its configured capacity, and test private chat, task assignment, status changes, and notifications. Repeat with an invitation and a rejected request. Run npm.cmd run typecheck and npm.cmd run build after setup.')

heading('Conclusion')
p('TeamUp implements the main steps of campus team collaboration, from discovery through team formation and day to day project work. Its strongest design choice is enforcing identity, ownership, membership, and capacity rules in the database as well as the application. A live two account walkthrough against the configured Supabase project remains the key final check before presenting it as fully validated.')

doc.save(OUT)
print(OUT)
