const LABELS = {
  "ACTIVEAURAS.FORM_IsAura": "Is Aura",
  "ACTIVEAURAS.FORM_IgnoreSelf": "Ignore Self",
  "ACTIVEAURAS.FORM_Hidden": "Hidden",
  "ACTIVEAURAS.FORM_Temporary": "Temporary",
  "ACTIVEAURAS.FORM_TargetsName": "Targets",
  "ACTIVEAURAS.FORM_TargetsEnemy": "Enemies",
  "ACTIVEAURAS.FORM_TargetsAllies": "Allies",
  "ACTIVEAURAS.FORM_TargetsAll": "All",
  "ACTIVEAURAS.FORM_Radius": "Radius",
  "ACTIVEAURAS.tabname": "Active Auras",
  "ACTIVEAURAS.FORM_Height": "Check Height",
  "ACTIVEAURAS.FORM_Alignment": "Alignment",
  "ACTIVEAURAS.FORM_Type": "Type",
  "ACTIVEAURAS.FORM_TypeDemonlord": "Ancestry",
  "ACTIVEAURAS.FORM_Good": "Good",
  "ACTIVEAURAS.FORM_Neutral": "Neutral",
  "ACTIVEAURAS.FORM_Evil": "Evil",
  "ACTIVEAURAS.FORM_TypePrompt": "Leave blank for any, or separate multiple types with semicolons",
  "ACTIVEAURAS.FORM_RadiusPrompt": "Aura radius in grid units",
  "ACTIVEAURAS.FORM_HostileTurn": "Only on Hostile Turn",
  "ACTIVEAURAS.FORM_ActivateOnce": "Activate Once",
  "ACTIVEAURAS.FORM_Wildcard": "Wildcard",
  "ACTIVEAURAS.FORM_Extra": "Extra",
  "ACTIVEAURAS.FORM_NameOverride": "Name Override",
  "ACTIVEAURAS.FORM_CustomCondition": "Custom Condition",
  "ACTIVEAURAS.FORM_CustomConditionPrompt": "JavaScript condition evaluated against the target token",
  "ACTIVEAURAS.FORM_WallsBlock": "Walls Block",
  "ACTIVEAURAS.FORM_SystemWallsBlock": "Use Module Default",
  "ACTIVEAURAS.FORM_WallsDoBlock": "Walls Block",
  "ACTIVEAURAS.FORM_WallsDontBlock": "Walls Do Not Block",
  "ACTIVEAURAS.FORM_StatusConditions": "Status Conditions",
};

export function aaLocalize(key, data = {}) {
  if (key === "ACTIVEAURAS.ApplyLog") return `ActiveAuras | '${data.effectDataName}' applied to ${data.tokenName}`;
  if (key === "ACTIVEAURAS.RemoveLog") {
    const effect = data.effectDataName ? `'${data.effectDataName}' ` : "";
    return `ActiveAuras | ${effect}removed from ${data.tokenName}`;
  }
  if (key === "ACTIVEAURAS.IgnoreSelfLog") {
    return `ActiveAuras | Ignored '${data.effectDataName}' ${data.changeKey} change for ${data.actorName}`;
  }
  return LABELS[key] ?? key;
}
