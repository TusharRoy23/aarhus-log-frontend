import { PaginatedResponse } from '../../constants/types';
import baseApi from './base_api';
import { apiPath } from './utils';

// The full organization-settings record — distinct from `auth.ts`'s own
// lean `Organization` type (`{uuid, name, designation?}`, used only for the
// login/org-selection flow). Same name, different file, same precedent
// already established by `schedule.ts`'s own lean `WorkLocation` vs
// `work-location.ts`'s fuller one — each file's `Organization`/`WorkLocation`
// describes only the shape that endpoint actually returns.
export type Organization = {
    uuid: string;
    name: string;
    slug: string;
    email: string;
    phone: string;
    address: string;
    is_active: boolean;
    qr_generated_at: string | null;
    /** 0-6, Monday-Sunday. */
    weekend_days: number[];
    created_at: string;
    updated_at: string;
};

export type UpdateOrganizationPayload = {
    phone: string;
    address: string;
    /** 0-6, Monday-Sunday. */
    weekend_days: number[];
};

export type InputType = 'number' | 'options' | 'text';

export type Rule = {
    uuid: string;
    label: string;
    input_type: InputType;
    number_value: number | null;
    options: string[] | null;
    selected_options?: string | null;
    /** Value when input_type is 'text' — not part of the backend contract
     * yet, added ahead of it per the confirmed field name. */
    text_value?: string | null;
    is_active: boolean;
    sub_rules?: Rule[];
}

export type RuleSection = {
    uuid: string;
    label: string;
    is_active: boolean;
    rules: Rule[];
    exempt: boolean;
}

// The slim shape sent back on save — only the fields the admin can actually
// edit (no label/options/created_at, which the server already has). Mirrors
// Rule/RuleSection's own recursive sub_rules nesting.
export type RuleUpdatePayload = {
    uuid: string;
    is_active: boolean;
    input_type: InputType;
    number_value?: number;
    selected_options?: string[];
    text_value?: string;
    sub_rules?: RuleUpdatePayload[];
}

export type RuleSectionUpdatePayload = {
    uuid: string;
    is_active: boolean;
    rules: RuleUpdatePayload[];
}

export type OverrideRulePayload = {
    is_active: boolean;
    number_value?: number;
    selected_options?: string[];
    text_value?: string;
}

export type EmpRulesPayload = {
    uuid: string;
    override: OverrideRulePayload;
    sub_rules?: EmpRulesPayload[];
}

export type EmpSectionRulesPayload = {
    uuid: string;
    override: OverrideRulePayload;
    rules?: EmpRulesPayload[]
}

export type RulesUpdatePayload = RuleSectionUpdatePayload[];
export type ExemptRulesPayload = {
    section_uuid: string;
    exempt: boolean;
}

const ORGANIZATION_PATH = '/organization/me/';
const RULES_PATH = '/organization/rule-sections/';
const EMP_RULES_PATH = '/organization/employees/';

export const organizationApi = {
    get: async (): Promise<Organization> => {
        const response = await baseApi.get<Organization>(apiPath(ORGANIZATION_PATH));
        return response.data;
    },
    update: async (payload: UpdateOrganizationPayload): Promise<Organization> => {
        const response = await baseApi.put<Organization>(apiPath(ORGANIZATION_PATH), payload);
        return response.data;
    },
    getRules: async (): Promise<PaginatedResponse<RuleSection>> => {
        const response = await baseApi.get<PaginatedResponse<RuleSection>>(apiPath(RULES_PATH));
        return response.data;
    },
    updateRules: async (payload: { sections: RuleSectionUpdatePayload[] }): Promise<{ message: string }> => {
        const response = await baseApi.put<{ message: string }>(apiPath(`/organization/rule-update/`), payload);
        return response.data;
    },
    getEmployeeRules: async (employeeUuid: string): Promise<PaginatedResponse<RuleSection>> => {
        const response = await baseApi.get<PaginatedResponse<RuleSection>>(apiPath(`${EMP_RULES_PATH}${employeeUuid}/rules/`));
        return response.data;
    },
    updateEmployeeRules: async (employeeUuid: string, payload: { sections: EmpSectionRulesPayload[] }): Promise<{ message: string }> => {
        const response = await baseApi.put<{ message: string }>(apiPath(`${EMP_RULES_PATH}${employeeUuid}/rules-override/`), payload);
        return response.data;
    },
    exemptRulesForEmployee: async (employeeUuid: string, payload: ExemptRulesPayload): Promise<{ message: string }> => {
        const response = await baseApi.put<{ message: string }>(apiPath(`${EMP_RULES_PATH}${employeeUuid}/exempt-rules/`), payload);
        return response.data;
    }
};
