package com.club_libertad.dtos;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ChangePasswordDTO {
    private String currentPassword;
    private String newPassword;
}
