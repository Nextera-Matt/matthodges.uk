#!/usr/bin/env python3
"""
Generate Matt Hodges' CV as an A4 PDF using ReportLab.

Content for the current role is taken from Fixter IT documentation in Notion.
The public PDF omits phone, street address, internal product names, IDs, and colleague names.
"""

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, HRFlowable, KeepTogether
from reportlab.lib.styles import ParagraphStyle

COLOR_PRIMARY = colors.HexColor("#1a1a2e")
COLOR_ACCENT = colors.HexColor("#3b82f6")
COLOR_MUTED = colors.HexColor("#555555")
COLOR_LINE = colors.HexColor("#d0d0d0")


def build_pdf(output_path: str) -> None:
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=62.69,
        rightMargin=62.69,
        topMargin=44,
        bottomMargin=44,
        title="Matt Hodges - CV",
        author="Matt Hodges",
        subject="CV - Systems Administrator, moving into DevOps",
    )

    styles = {
        "Name": ParagraphStyle(
            "Name",
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=COLOR_PRIMARY,
            spaceAfter=2,
        ),
        "Headline": ParagraphStyle(
            "Headline",
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=COLOR_ACCENT,
            spaceAfter=4,
        ),
        "Contact": ParagraphStyle(
            "Contact",
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=COLOR_MUTED,
        ),
        "SectionHeader": ParagraphStyle(
            "SectionHeader",
            fontName="Helvetica-Bold",
            fontSize=10.5,
            leading=13.5,
            textColor=COLOR_ACCENT,
            spaceBefore=7,
            spaceAfter=4,
        ),
        "Body": ParagraphStyle(
            "Body",
            fontName="Helvetica",
            fontSize=9,
            leading=12.5,
            textColor=COLOR_PRIMARY,
            spaceAfter=3,
        ),
        "JobTitle": ParagraphStyle(
            "JobTitle",
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=COLOR_PRIMARY,
            spaceBefore=5,
            spaceAfter=1,
        ),
        "JobMeta": ParagraphStyle(
            "JobMeta",
            fontName="Helvetica-Oblique",
            fontSize=8.5,
            leading=11.5,
            textColor=COLOR_MUTED,
            spaceAfter=3,
        ),
        "Bullet": ParagraphStyle(
            "Bullet",
            fontName="Helvetica",
            fontSize=9,
            leading=12.2,
            textColor=COLOR_PRIMARY,
            leftIndent=12,
            firstLineIndent=-12,
            spaceAfter=2,
        ),
        "SkillCategory": ParagraphStyle(
            "SkillCategory",
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11.5,
            textColor=COLOR_PRIMARY,
        ),
        "SkillList": ParagraphStyle(
            "SkillList",
            fontName="Helvetica",
            fontSize=8.5,
            leading=11.5,
            textColor=COLOR_PRIMARY,
        ),
    }

    story = []

    def hr():
        return HRFlowable(width="100%", thickness=0.5, color=COLOR_LINE, spaceBefore=5, spaceAfter=5)

    story.append(Paragraph("Matt Hodges", styles["Name"]))
    story.append(Paragraph("Systems Administrator  •  moving into DevOps", styles["Headline"]))
    contact = (
        "Manchester, UK &nbsp;•&nbsp; "
        '<font color="#3b82f6"><a href="mailto:contact@matthodges.uk">contact@matthodges.uk</a></font> &nbsp;•&nbsp; '
        '<font color="#3b82f6"><a href="https://matthodges.uk">matthodges.uk</a></font><br/>'
        '<font color="#3b82f6"><a href="https://github.com/Nextera-Matt">github.com/Nextera-Matt</a></font> &nbsp;•&nbsp; '
        '<font color="#3b82f6"><a href="https://www.linkedin.com/in/matt-hodges-7b0642192/">linkedin.com/in/matt-hodges-7b0642192</a></font>'
    )
    story.append(Paragraph(contact, styles["Contact"]))
    story.append(hr())

    story.append(Paragraph("PROFESSIONAL SUMMARY", styles["SectionHeader"]))
    story.append(Paragraph(
        "Systems Administrator at Fixter, moving into DevOps. I keep identity, access, and the device fleet "
        "running across six countries, and I am taking on more automation and infrastructure work — IAM, "
        "monitoring, GDPR tooling, and documentation a team can actually use. Previously six years at THG "
        "Ingenuity, progressing from infrastructure apprentice through to Cloud &amp; Infrastructure Engineer.",
        styles["Body"],
    ))
    story.append(hr())

    story.append(Paragraph("TECHNICAL SKILLS", styles["SectionHeader"]))
    skills_data = [
        [
            Paragraph("Identity / Access", styles["SkillCategory"]),
            Paragraph("Google Workspace, AWS IAM, Cognito, 1Password, role-based access, joiner–mover–leaver", styles["SkillList"]),
        ],
        [
            Paragraph("Devices / MDM", styles["SkillCategory"]),
            Paragraph("Jamf, Apple Business Manager, Bitdefender, Deel IT, hardware procurement", styles["SkillList"]),
        ],
        [
            Paragraph("Cloud / Infra", styles["SkillCategory"]),
            Paragraph("AWS (IAM, ACM, EventBridge), Postgres + bastion access, GitHub, Docker", styles["SkillList"]),
        ],
        [
            Paragraph("Automation", styles["SkillCategory"]),
            Paragraph("Python, Bash, Ansible, Zapier, Git, scheduled reconciliation and alerting", styles["SkillList"]),
        ],
        [
            Paragraph("Compliance", styles["SkillCategory"]),
            Paragraph("GDPR SAR and erasure, security reviews, access matrix, SaaS licensing", styles["SkillList"]),
        ],
        [
            Paragraph("Linux / Hosting", styles["SkillCategory"]),
            Paragraph("RHEL family, Ubuntu, Windows Server, DNS, SSL/TLS, firewalls, cPanel/WHM", styles["SkillList"]),
        ],
    ]
    table = Table(skills_data, colWidths=[106, 363.89])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(table)
    story.append(hr())

    story.append(Paragraph("PROFESSIONAL EXPERIENCE", styles["SectionHeader"]))

    story.append(Paragraph("Systems Administrator", styles["JobTitle"]))
    story.append(Paragraph("Fixter &nbsp;•&nbsp; August 2026 – Present", styles["JobMeta"]))
    for bullet in [
        "Run joiner and leaver processing across Google Workspace, Slack, the ticket system, Jamf, 1Password, department tools, Cognito, and scoped database/bastion accounts for engineers, using a role-based access matrix so people get the access their role needs.",
        "Manage the device fleet and MDM: Jamf, Apple Business Manager, inventory, Bitdefender, and Deel IT. Source and reassign hardware across the UK, France, India, South Africa, Morocco, and Romania.",
        "Own identity and access work in AWS (IAM users, groups, roles, MFA, least-privilege reviews) and Cognito user/role management for internal applications.",
        "Handle GDPR subject-access and erasure requests within the 30-day window, including Python tooling for SAR export and erasure rather than one-off SQL.",
        "Shipped operational automation: ACM certificate-expiry alerts to Slack (after a missed auto-renewal), new-ticket alerts from the ticket system to Slack, and Jamf ↔ inventory serial-number reconciliation so fleet drift is caught instead of sitting for months.",
        "Building IT documentation in Notion — process articles, access and ownership records, automation candidates, and licence tracking — so the work is written down and the team can run it.",
        "Moving into DevOps: IAM elevation (read-only by default, MFA to elevate), GDPR script hardening, certificate and alarm hygiene, and more infrastructure the team can operate without waiting on one person.",
    ]:
        story.append(Paragraph(f"• {bullet}", styles["Bullet"]))

    story.append(Paragraph("Cloud &amp; Infrastructure Engineer", styles["JobTitle"]))
    story.append(Paragraph("THG Ingenuity &nbsp;•&nbsp; November 2021 – March 2026 (4 yrs 5 mos)", styles["JobMeta"]))
    for bullet in [
        "L3 technical support across bare metal, VPS, and cloud Linux platforms: incidents, hardware diagnostics, firewalls (iptables/nftables), storage (RAID/LVM), DNS/SSL, and application-layer faults. On-call for high-priority and VIP work.",
        "Day-to-day infrastructure: OS installs, performance tuning, customer and internal environments, and eight months embedded with Linux Operations supporting production and development.",
        "Alongside that L3 role, built internal ops tooling the team used daily: a unified support dashboard (three ticketing platforms, RBAC, two-tier cache), out-of-hours paging with four escalation tiers, Zabbix agent rollout via Ansible across 500+ servers, and active-passive DR with 60-second replication between two data centres.",
        "Wrote runbooks and knowledge-base articles so common work was documented, not trapped with one engineer.",
    ]:
        story.append(Paragraph(f"• {bullet}", styles["Bullet"]))

    earlier_roles = [
        Paragraph("Hosting Support Engineer", styles["JobTitle"]),
        Paragraph("THG Ingenuity &nbsp;•&nbsp; September 2020 – November 2021 (1 yr 3 mos)", styles["JobMeta"]),
        Paragraph(
            "• Escalation point for complex hosting issues across shared, VPS, and dedicated servers (DNS, web, email, SSL/TLS, cPanel/Plesk); kept the knowledge base current so common work was documented.",
            styles["Bullet"],
        ),
        Paragraph("Infrastructure Technician Apprentice", styles["JobTitle"]),
        Paragraph("THG Ingenuity &nbsp;•&nbsp; August 2019 – September 2020 (1 yr 2 mos)", styles["JobMeta"]),
        Paragraph(
            "• Technical support by phone, email, and live chat; Hyper-V, Windows Server, and PowerShell. Completed BCS Level 3 Infrastructure Technician apprenticeship.",
            styles["Bullet"],
        ),
        hr(),
        Paragraph("EDUCATION &amp; CERTIFICATIONS", styles["SectionHeader"]),
        Paragraph(
            "• Actively studying towards RHCSA / RHCE (self-directed labs and coursework).",
            styles["Bullet"],
        ),
        Paragraph(
            "• VMware VCTA–DCV &nbsp;•&nbsp; Microsoft MTA (Networking, Cloud, Mobility &amp; Device) &nbsp;•&nbsp; BCS Level 3 Infrastructure Technician.",
            styles["Bullet"],
        ),
    ]
    story.append(KeepTogether(earlier_roles))

    doc.build(story)


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "Matt_Hodges_CV.pdf")
    build_pdf(target)
    print(f"Generated CV PDF at: {target}")
