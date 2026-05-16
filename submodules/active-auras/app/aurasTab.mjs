import CONSTANTS from "../constants.mjs";
import { aaLocalize } from "../labels.mjs";


export async function extendEffectsForm(sheet, html) {
  if (foundry.utils.isNewerVersion(game.version ?? "", "13")) return;

  const flags = sheet.object.flags ?? {};
  const FormIsAura = aaLocalize("ACTIVEAURAS.FORM_IsAura");
  const FormIgnoreSelf = aaLocalize("ACTIVEAURAS.FORM_IgnoreSelf");
  const FormHidden = aaLocalize("ACTIVEAURAS.FORM_Hidden");
  const FormTemporary = aaLocalize("ACTIVEAURAS.FORM_Temporary");
  const FormTargetsName = aaLocalize("ACTIVEAURAS.FORM_TargetsName");
  const FormTargetsEnemy = aaLocalize("ACTIVEAURAS.FORM_TargetsEnemy");
  const FormTargetsAllies = aaLocalize("ACTIVEAURAS.FORM_TargetsAllies");
  const FormTargetsAll = aaLocalize("ACTIVEAURAS.FORM_TargetsAll");
  const FormRadius = aaLocalize("ACTIVEAURAS.FORM_Radius");
  const AuraTab = aaLocalize("ACTIVEAURAS.tabname");
  const FormCheckHeight = aaLocalize("ACTIVEAURAS.FORM_Height");
  const FormCheckAlignment = aaLocalize("ACTIVEAURAS.FORM_Alignment");
  const FormCheckType = aaLocalize("ACTIVEAURAS.FORM_Type");
  const FormGood = aaLocalize("ACTIVEAURAS.FORM_Good");
  const FormNeutral = aaLocalize("ACTIVEAURAS.FORM_Neutral");
  const FormEvil = aaLocalize("ACTIVEAURAS.FORM_Evil");
  const FormTypePrompt = aaLocalize("ACTIVEAURAS.FORM_TypePrompt");
  const FormRadiusPrompt = aaLocalize("ACTIVEAURAS.FORM_RadiusPrompt");
  const HostileTurn = aaLocalize("ACTIVEAURAS.FORM_HostileTurn");
  const ActivateOnce = aaLocalize("ACTIVEAURAS.FORM_ActivateOnce");
  const Wildcard = aaLocalize("ACTIVEAURAS.FORM_Wildcard");
  const Extra = aaLocalize("ACTIVEAURAS.FORM_Extra");
  const FormNameOverride = aaLocalize("ACTIVEAURAS.FORM_NameOverride");
  const FormCustomCondition = aaLocalize("ACTIVEAURAS.FORM_CustomCondition");
  const FormCustomConditionPrompt = aaLocalize("ACTIVEAURAS.FORM_CustomConditionPrompt");
  const WallsBlockPrompt = aaLocalize("ACTIVEAURAS.FORM_WallsBlock");
  const FormSystemWallsBlock = aaLocalize("ACTIVEAURAS.FORM_SystemWallsBlock");
  const FormWallsBlock = aaLocalize("ACTIVEAURAS.FORM_WallsDoBlock");
  const FormWallsDontBlock = aaLocalize("ACTIVEAURAS.FORM_WallsDontBlock");
  const FormStatusConditions = aaLocalize("ACTIVEAURAS.FORM_StatusConditions");

  const tab = `<a class="item" data-tab="ActiveAuras"><i class="fas fa-broadcast-tower"></i> ${AuraTab}</a>`;
  const type = flags[CONSTANTS.MODULE_NAME]?.type ?? "";
  const customCheck = flags[CONSTANTS.MODULE_NAME]?.customCheck?.replace("\\\"", "\"") ?? "";
  const alignment = flags[CONSTANTS.MODULE_NAME]?.alignment ?? "";
  const radius = flags[CONSTANTS.MODULE_NAME]?.radius ?? "";
  const nameOverride = flags[CONSTANTS.MODULE_NAME]?.nameOverride ?? "";
  const wallsBlock = flags[CONSTANTS.MODULE_NAME]?.wallsBlock ?? "system";

  const flagStatuses = flags[CONSTANTS.MODULE_NAME]?.statuses ?? [];
  const statuses = CONFIG.statusEffects.map((s) => {
    return {
      id: s.id,
      label: game.i18n.localize(s.name),
      selected: flagStatuses.includes(s.id) ? "selected" : ""
    };
  });


  let statusHtml = "";
  for (const status of statuses ) {
    statusHtml += `<option value="${status.id}" ${status.selected}> ${status.label}</option>`;
  }

  let contents = `
    <div class="tab" data-tab="ActiveAuras">
        <div class="form-group">
            <label>${FormIsAura}?</label>
            <input name="flags.${CONSTANTS.MODULE_NAME}.isAura" type="checkbox" ${flags[CONSTANTS.MODULE_NAME]?.isAura ? "checked" : ""}></input>
        </div>
        <div class="form-group">
                <label>${FormTargetsName}:</label>
                <select name="flags.${CONSTANTS.MODULE_NAME}.aura" data-dtype="String" value=${flags[CONSTANTS.MODULE_NAME]?.aura}>
                    <option value="None" ${flags[CONSTANTS.MODULE_NAME]?.aura === "None" ? "selected" : ""}></option>
                    <option value="Enemy"${flags[CONSTANTS.MODULE_NAME]?.aura === "Enemy" ? "selected" : ""}>${FormTargetsEnemy}</option>
                    <option value="Allies"${flags[CONSTANTS.MODULE_NAME]?.aura === "Allies" ? "selected" : ""}>${FormTargetsAllies}</option>
                    <option value="All"${flags[CONSTANTS.MODULE_NAME]?.aura === "All" ? "selected" : ""}>${FormTargetsAll}</option>
                </select>
        </div>
        <div id="specifics">
            <div class="form-group">
                <label>${FormNameOverride}</label>
                <input id="type" name="flags.${CONSTANTS.MODULE_NAME}.nameOverride" type="text" value="${nameOverride}" placeholder=""></input>
            </div>
            <div class="form-group">
                <label>${FormRadius}</label>
                <input id="radius" name="flags.${CONSTANTS.MODULE_NAME}.radius" type="text" min="0" step="any" value="${radius}" placeholder="${FormRadiusPrompt}"></input>
            </div>
            <div class="form-group">
                <label>${FormCheckAlignment}:</label>
                <select name="flags.${CONSTANTS.MODULE_NAME}.alignment" data-dtype="String" value=${alignment}>
                    <option value="" ${flags[CONSTANTS.MODULE_NAME]?.alignment === "" ? "selected" : ""}></option>
                    <option value="good"${flags[CONSTANTS.MODULE_NAME]?.alignment === "good" ? "selected" : ""}>${FormGood}</option>
                    <option value="neutral"${flags[CONSTANTS.MODULE_NAME]?.alignment === "neutral" ? "selected" : ""}>${FormNeutral}</option>
                    <option value="evil"${flags[CONSTANTS.MODULE_NAME]?.alignment === "evil" ? "selected" : ""}>${FormEvil}</option>
                </select>
            </div>
            <div class="form-group">
                <label>${FormCheckType}</label>
                <input id="type" name="flags.${CONSTANTS.MODULE_NAME}.type" type="text" value="${type}" placeholder="${FormTypePrompt}"></input>
            </div>
            <div class="form-group">
              <label>${FormCustomCondition}</label>
              <input id="type" name="flags.${CONSTANTS.MODULE_NAME}.customCheck" type="text" value="${customCheck}" placeholder="${FormCustomConditionPrompt}"></input>
            </div>
            <div class="form-group">
                <label>${FormIgnoreSelf}?</label>
                <input name="flags.${CONSTANTS.MODULE_NAME}.ignoreSelf" type="checkbox" ${flags[CONSTANTS.MODULE_NAME]?.ignoreSelf ? "checked" : ""}></input>
            </div>
            <div class="form-group">
                <label>${FormCheckHeight}</label>
                <input name="flags.${CONSTANTS.MODULE_NAME}.height" type="checkbox" ${flags[CONSTANTS.MODULE_NAME]?.height ? "checked" : ""}></input>
            </div>
            <div class="form-group">
                <label>${FormHidden}?</label>
                <input name="flags.${CONSTANTS.MODULE_NAME}.hidden" type="checkbox" ${flags[CONSTANTS.MODULE_NAME]?.hidden ? "checked" : ""}></input>
            </div>
            <div class="form-group">
                <label>${FormTemporary}?</label>
                <input name="flags.${CONSTANTS.MODULE_NAME}.displayTemp" type="checkbox" ${flags[CONSTANTS.MODULE_NAME]?.displayTemp ? "checked" : ""}></input>
            </div>
            <div class="form-group">
                <label>${HostileTurn}</label>
                <input name="flags.${CONSTANTS.MODULE_NAME}.hostile" type="checkbox" ${flags[CONSTANTS.MODULE_NAME]?.hostile ? "checked" : ""}></input>
            </div>
            <div class="form-group">
                <label>${ActivateOnce}</label>
                <input name="flags.${CONSTANTS.MODULE_NAME}.onlyOnce" type="checkbox" ${flags[CONSTANTS.MODULE_NAME]?.onlyOnce ? "checked" : ""}></input>
            </div>
            <div class="form-group">
                <label>${WallsBlockPrompt}:</label>
                <select name="flags.${CONSTANTS.MODULE_NAME}.wallsBlock" data-dtype="String" value=${wallsBlock}>
                    <option value="system" ${wallsBlock === "system" ? "selected" : ""}>${FormSystemWallsBlock}</option>
                    <option value="true"${wallsBlock === "true" ? "selected" : ""}>${FormWallsBlock}</option>
                    <option value="false"${wallsBlock === "false" ? "selected" : ""}>${FormWallsDontBlock}</option>
                </select>
          </div>
              <div class="form-group">
              <label>${FormStatusConditions}</label>
              <div class="form-fields">
                  <multi-select name="flags.${CONSTANTS.MODULE_NAME}.statuses">
                      ${statusHtml}
                  </multi-select>
              </div>
          </div>
            `;

  if (game.system.id === "swade") {
    contents += `
      <div class="form-group">
          <label>${Wildcard}</label>
          <input name="flags.${CONSTANTS.MODULE_NAME}.wildcard" type="checkbox" ${flags[CONSTANTS.MODULE_NAME]?.wildcard ? "checked" : ""}></input>
      </div>
      <div class="form-group">
          <label>${Extra}</label>
          <input name="flags.${CONSTANTS.MODULE_NAME}.extra" type="checkbox" ${flags[CONSTANTS.MODULE_NAME]?.extra ? "checked" : ""}></input>
      </div>
      </div></div>`;
  }
  else {
    contents += "</div></div>";
  }

  const appliedAuraContent = `
    <div class="tab" data-tab="ActiveAuras">
        <h3> You cannot alter an applied aura </h3>
    </div>`;

  html.find(".tabs .item").last().after(tab);
  if (!flags[CONSTANTS.MODULE_NAME]?.applied) html.find(".tab").last().after(contents);
  else html.find(".tab").last().after(appliedAuraContent);

  let $isAura = html.find(`input[name="flags.${CONSTANTS.MODULE_NAME}.isAura"]`);
  let $specifics = html.find("#specifics");
  let $targets = html.find(`select[name="flags.${CONSTANTS.MODULE_NAME}.aura"]`);


  $isAura.on("change", function () {
    const isAura = this.checked;
    switch (isAura) {
      case true:
        $targets.closest(".form-group").show(500);
        break;
      case false:
        $targets.closest(".form-group").hide(500);
        $specifics.hide(500);
        break;
    }
    html.css({ height: "auto" });
    $targets.trigger("change");
  });
  $targets.on("change", function () {
    const targets = $(this).val();

    if (targets === "None") {
      $specifics.hide(500);
    }
    else {
      if ($isAura.prop("checked")) {
        $specifics.show(500);
      }
    }
    html.css({ height: "auto" });
  });

  $isAura.trigger("change");
  html.css({ height: "auto" });

}
