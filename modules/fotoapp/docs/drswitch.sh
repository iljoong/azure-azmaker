#!/bin/bash

rgname="<rgname>"
prefix="<prefix>"

tmname="${prefix}tm"
webname="${prefix}web"
schname="${prefix}sch"
apikey="<api key>"
apikeydr="<api key 2>"

if [ $# -eq 0 ]
then
	echo "$0 [failover | failback ]"
else
	if [ $1 == "failover" ]
	then
		echo "executing failover"

		curl -H "api-key: $apikeydr" -H "Content-Type: application/json" \
			-X post https://${schname}dr.search.windows.net/indexers/fotos-json-indexer/run?api-version=2016-09-01

		az network traffic-manager endpoint update -g $rgname --profile-name $tmname  --name endpoint1 --priority 3 \
			--type "azureEndpoints"

		az appservice web config appsettings update -n $webname -g $rgname --settings FOTOS_READONLY=true
		az appservice web config appsettings update -n ${webname}dr -g ${rgname}dr --settings FOTOS_READONLY=false
	else
		echo "executing failback"

		curl -H "api-key: $apikey" -H "Content-Type: application/json" \
			-X post https://${schname}.search.windows.net/indexers/fotos-json-indexer/run?api-version=2016-09-01

		az network traffic-manager endpoint update -g $rgname --profile-name $tmname  --name endpoint1 --priority 1 \
			--type "azureEndpoints"

		az appservice web config appsettings update -n $webname -g $rgname --settings FOTOS_READONLY=false

		az appservice web config appsettings update -n ${webname}dr -g ${rgname}dr --settings FOTOS_READONLY=true
	fi
fi