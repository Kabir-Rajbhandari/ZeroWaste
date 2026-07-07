package com.zerowaste.zerowaste.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DonateRequest {
    private String location;
    private String availableTime;
    private String contactDetail;
}
