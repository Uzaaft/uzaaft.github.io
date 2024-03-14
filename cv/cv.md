---
#=== HTML OPTIONS ===#
theme: "#545963"
icons: icon
button:
  - name: '<i class="fab fa-linkedin-in"></i>'
    url: https://www.linkedin.com/in/uzaaft
resume:
  - name: Printable CV
    url: resume.pdf
  - name: Man Page
    url: micah.7.html

#=== MAN PAGE OPTIONS ===#
lower: micah
upper: MICAH
flag:
  - name: student
  - name: employee
  - name: admin
    option:
      - systems
      - databases
  - name: developer
  - name: researcher

#=== GENERAL DETAILS ===$
name: Muhammad Uzair Aftab
picture: images/micah.jpeg
location: Fetsund, Norge
phone: +47 412 72 901
email: uzair@polmath.no
<!-- url: mehalter.com -->
git:
  user: uzaaft
  url: github.com

<!-- keyserver: -->
<!--   - fingerprint: BEB8 056E 542A 33EB 8A4B 081F 723F 998E 98D9 3D50 -->
<!--     url: https://keyserver.ubuntu.com/pks/lookup?search=0x723F998E98D93D50&fingerprint=on&op=index -->
<!--   - fingerprint: 4AC9 4692 18E3 1BCE 147F 1060 E51C 3EA3 BEB5 D4A9 -->
<!--     url: https://keyserver.ubuntu.com/pks/lookup?search=0xE51C3EA3BEB5D4A9&fingerprint=on&op=index -->
<!--   - fingerprint: 4323 17EB 443E 7433 0ACC A2A0 8FCF 3800 ED2E B2C2 -->
<!--     url: https://keyserver.ubuntu.com/pks/lookup?search=0x8FCF3800ED2EB2C2&fingerprint=on&op=index -->

#=== DESCRIPTIONS ===#
tagline: "a developer, researcher, and bartender"

summary: "I’m a <strong>computer science researcher</strong> at <strong>University of Florida</strong> based out of Englewood, New Jersey."

about-me: "I have been interested in computer science since I was six years old, and have built up an unmatched passion for the field. I have extensive experience in software development and research from internships, projects, and competitions. I graduated from the Georgia Institute of Technology with a Bachelor of Science in Computer Science with a focus in system architecture and theory and a Masters of Science in Computer Science with a specialization in Machine learning. I am currently working as a research programmer at the University of Florida."

description:
  sys-admin: "Through work opportunities and personal projects, I have had extensive experience with the configuration, hardening, and maintenance of various Linux distributions, including:"
  database-admin: "Through my work experiences I have become skilled in many database languages including MySQL, PostgreSQL, SQLite, and SQL Server. These experiences range from designing a full database schema, administrating and managing an existing database, and writing queries to parse through the data."
  developer: "I have worked on several development projects in both work environments and personally using a plethora of different programming languages and paradigms"
  researcher: "While working at the Georgia Tech Research Institute, I have found that I love being involved with research projects. I enjoy taking charge of open ended questions and exploring new methods and ways of tackling tough problems."

#=== EDUCATION ===#
education:
  - start: Aug&nbsp;2018
    end: June&nbsp;2023
    degree: Master of Science in Data Science
    school: Norwegian University of Life Sciences
    id: git
    location: Ås, Norway
    notes:
      - "Specialization in **Physics**"
  #- start: Aug&nbsp;2017
  #  end: Dec&nbsp;2017
  #  degree: Bachelor of Science in Computer Science
  #  school: Hong Kong University of Science and Technology
  #  id: hkust
  #  location: Hong Kong
  #  notes:
  #    - "Studied abroad"

#=== WORK EXPERIENCE ===#
experience:
  - company: Co-Founder at Polymath
    position:
      - title: Founder
        company: Polymath AS
        start: Mar&nbsp;2023
        end: Present
        id: boeing
        location: Ås, Norway
        notes:
          - Engaged in software development projects with industry partners at the Norwegian University of Life Sciences to gain practical experience beyond the curriculum.
          - Conducted machine learning workshops and mentored students in full-stack and backend development.
          - Initiated the establishment of Eik Lab mentors, enhancing the onboarding experience for new students at Eik Lab.
  - company: Co-founder at Njord Technologies AS
    position:
      - title: Founder
        company: Njord Technologies AS
        start: Jan&nbsp;2021
        end: Mars&nbsp;2023
        id: boeing
        location: Ås, Norway
        notes:
          - Co-founded and managed Njord Technologies from 2021 to 2023 with Aleksander Eriksen, focusing on full-stack application development primarily in TypeScript.
          - Created a full-stack web application using TypeScript and Next.js for Tap.IT AS, designed to collect and visualize sensor data.
          - Contributed as a developer to a project that produced advanced engineering software, fostering a data-driven sales approach within the client's organization.
          - Engineered and integrated a feature for Soundsensing AS that generates data-driven reports, seamlessly incorporating it into their existing backend and frontend systems.
  - company: Lecturer and Teaching Assistant at NMBU
    position:
      - title: Lecturer and Teaching Assistant
        company: Norwegian University of Life Sciences
        start: May&nbsp;2020
        end: Jan&nbsp;2021
        id: gtri
        location: Ås, Norway
        notes:
          - Lecturer and Teaching Assistant for the subjects TEL100, TIN100, and TIN200.
          - "Developed teaching materials in the form of video lectures during COVID-19 for Arduino, IoT, Python and Streamlit"
          - Held lectures and aided students with project work within Arduino, IoT, Embedded systems, and High fidelity prototyping.
  - company: Software developer at Sensorita AS
    position:
      - title: Software developer
        company: Sensorita AS
        start: Oct&nbsp;2020
        end: Jan&nbsp;2021
        #end: Nov&nbsp;2022
        id: balena
        location: Ås, Norway
        notes:
          - "Sensorita is a startup, specializing in pioneering sensor technology for precise fill-level measurement in large waste containers, combining radar signals and machine learning for reliability in extreme environments."
          - "Led the software development of the first Proof of Concept for Sensorita AS alongside their CTO, Emil Skar, programming the backend, and the software that interfaced with and collected data from the Sensors."
  - company:  Software Developer at Ledo AS
    position:
      - title: Software Developer
        company: Ledo AS
        start: Mar&nbsp;2020
        end: Jan&nbsp;2021
        id: uf
        location: Ås, Norway
        notes:
          - "Planned and executed a technical feasibility study within the field of aqua culture and computer vision."

#=== PROJECTS ===#
project:
  - name: Astrocommunity
    id: astronvim
    type: Software Development
    repo: https://github.com/AstroNvim/Astrocommunity
    logo: images/astronvim.svg
    notes:
      - "Core maintainer for a powerful community drive Neovim plugin ecosystem in **Lua**, with >800 stars"
      - "**Handle issues and review Pull Requests** raised by users of this software"

open-source:
  - type: "Core Maintainer"
    id: "maintainer"
    entries:
      - repo: "Astrocommunity"
        url: "https://github.com/AstroNvim/Astrocommunity"

#=== SKILLS ===#
skill:
  - line:
      - Full-Stack Development
      - API development
      - Database Design
      - Application development in Tauri
      - High Performance Computing

language:
  - Rust
  - Typescript
  - JavaScript
  - Tailwindcss
  - HTML
  - CSS
  - SQL
  - PGSQL
  - Python

#=== COMMUNITY INVOLVEMENT ===#
community:
- start: Aug&nbsp;2018
  end:     June&nbsp;2023
  name:  Eik Lab, formerly Eik Ideverksted
  place: Norwegian University of Life Sciences
  notes:
      - "Took on software development projects with industry partners with the goal to attain hands-on experience outside of the curriculum."
      - "Held workshops within the field of machine learning, and mentored students interested in fullstack and backend development."
      - "Spearheaded the creation of the Eik Lab mentors to improve the experience for new students at Eik Lab."
#- start: Aug&nbsp;2015
#  end:     May&nbsp;2017
#  name:    TEDxGeorgiaTech
#  place: Georgia Institute of Technology and TED
#  notes:
#        - "Organized an official TEDx university even with a group of students at Georgia Tech"
#        - "Designed all of the visuals for the conference, including rewriting the event website TEDxGeorgiaTech.com"
#- start: Aug&nbsp;2013
#  end:     Jun&nbsp;2015
#  name:    Research Triangle Google Development Group
#  place: Google
#  notes:
#        - "Competed in various hack-a-thon events hosted by Google and won the Android Wear hack-a-thon"
#        - "Participated in code labs wth the group to explore technologies like Dart language and AngularJS"

#=== ADDITIONAL NOTES ===#
additional-notes:
  - "Outside of the field of computer science I have many hobbies and passions including Ultimate Frisbee, coffee, and music."
  - "At Georgia Tech and the greater Atlanta area, I am a very active member of the Ultimate Frisbee community. This includes playing on multiple competitive teams throughout the years and competing in tournaments nationally and globally."
  - "I have been an avid coffee enthusiast for several years, frequenting many coffee shops, getting to know local coffee roasters and baristas, and hand brewing my own craft coffee."
  - "Growing up I was very involved with band and played many instruments including piano and flute. Nowadays I don’t play very often, but love to attend concerts and live music events."
---
