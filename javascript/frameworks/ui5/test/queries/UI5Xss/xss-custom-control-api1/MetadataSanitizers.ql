/**
 * @name Restricted UI5 property types
 * @description Only known restricted primitive property types act as XSS barriers.
 * @kind table
 * @id test/ui5-restricted-property-types
 * @tags test
 */

import advanced_security.javascript.frameworks.ui5.Sanitizers

from PropertyMetadata property
where property instanceof NonStringControlProperty
select property.getType()
