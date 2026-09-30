import { useTemplateData } from "./_private/use-template-data";
import { useTemplatePreview } from "./_private/use-template-preview";
import { useTemplateWizard } from "./_private/use-template-wizard";

export function useDocumentTemplates() {
  const data = useTemplateData();
  const wizard = useTemplateWizard(data.orgId, data.refresh);
  const preview = useTemplatePreview(data.orgId, data.defaultTemplate);

  function openWizardPreview() {
    if (wizard.createdTemplateId && wizard.result)
      preview.openById(wizard.createdTemplateId, wizard.form.getValues("name"));
  }

  return { data, wizard, preview, openWizardPreview };
}
