with open('src/components/features/team-management/SettingsClientPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace local Category interface name and usage
content = content.replace("interface Category {", "interface ComplaintCategory {")
content = content.replace("initialCategories: Category[]", "initialCategories: ComplaintCategory[]")
content = content.replace("useState<Category[]>", "useState<ComplaintCategory[]>")
content = content.replace("initialCategories: Category[]", "initialCategories: ComplaintCategory[]")

with open('src/components/features/team-management/SettingsClientPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Renamed Category to ComplaintCategory in SettingsClientPage.tsx")
