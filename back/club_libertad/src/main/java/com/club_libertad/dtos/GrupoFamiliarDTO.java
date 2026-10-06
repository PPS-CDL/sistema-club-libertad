package com.club_libertad.dtos;

import java.util.List;

public class GrupoFamiliarDTO {
    private Long responsableId;
    private List<Long> integrantesIds;

    public Long getResponsableId() { return responsableId; }
    public void setResponsableId(Long responsableId) { this.responsableId = responsableId; }

    public List<Long> getIntegrantesIds() { return integrantesIds; }
    public void setIntegrantesIds(List<Long> integrantesIds) { this.integrantesIds = integrantesIds; }
}