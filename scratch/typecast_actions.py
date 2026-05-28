with open('src/components/features/team-management/SettingsClientPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add explicit typecasting to ComplaintCategory for the server action return values
content = content.replace(
    "const added = await createComplaintCategoryAction(newCategoryName.trim())",
    "const added = await createComplaintCategoryAction(newCategoryName.trim()) as ComplaintCategory"
)
content = content.replace(
    "const updated = await updateComplaintCategoryAction(id, editingName.trim())",
    "const updated = await updateComplaintCategoryAction(id, editingName.trim()) as ComplaintCategory"
)

with open('src/components/features/team-management/SettingsClientPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added type assertions in SettingsClientPage.tsx")
